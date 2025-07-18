#!/bin/bash
# Ventaro AI - EKS GPU Node User Data Script
# Bootstrap script for GPU-enabled EKS worker nodes with NVIDIA support

set -o xtrace

# Variables passed from Terraform
CLUSTER_NAME="${cluster_name}"
CLUSTER_ENDPOINT="${cluster_endpoint}"
CLUSTER_CA="${cluster_ca}"
BOOTSTRAP_ARGUMENTS="${bootstrap_arguments}"

# Update system packages
yum update -y

# Install additional packages
yum install -y \
    awscli \
    jq \
    wget \
    curl \
    unzip \
    git \
    htop \
    iotop \
    sysstat \
    nc \
    telnet \
    tcpdump \
    strace \
    lsof \
    gcc \
    gcc-c++ \
    make \
    kernel-devel \
    kernel-headers \
    dkms \
    pciutils \
    lshw

# Configure AWS CLI region
aws configure set region $(curl -s http://169.254.169.254/latest/meta-data/placement/region)

# Install kubectl
curl -o kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.28.3/2023-11-14/bin/linux/amd64/kubectl
chmod +x ./kubectl
mv ./kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
mv /tmp/eksctl /usr/local/bin

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Disable nouveau driver (conflicts with NVIDIA)
echo 'blacklist nouveau' >> /etc/modprobe.d/blacklist.conf
echo 'options nouveau modeset=0' >> /etc/modprobe.d/blacklist.conf

# Regenerate initramfs
dracut --force

# Install NVIDIA drivers
echo "Installing NVIDIA drivers..."

# Download and install NVIDIA driver
NVIDIA_DRIVER_VERSION="535.129.03"
wget https://us.download.nvidia.com/tesla/${NVIDIA_DRIVER_VERSION}/NVIDIA-Linux-x86_64-${NVIDIA_DRIVER_VERSION}.run
chmod +x NVIDIA-Linux-x86_64-${NVIDIA_DRIVER_VERSION}.run
./NVIDIA-Linux-x86_64-${NVIDIA_DRIVER_VERSION}.run --silent --dkms

# Verify NVIDIA driver installation
nvidia-smi
if [ $? -ne 0 ]; then
    echo "NVIDIA driver installation failed"
    exit 1
fi

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.repo | tee /etc/yum.repos.d/nvidia-container-toolkit.repo
yum clean expire-cache
yum install -y nvidia-container-toolkit

# Configure Docker for NVIDIA runtime
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# Configure Docker daemon with GPU support
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "exec-opts": ["native.cgroupdriver=systemd"],
  "live-restore": true,
  "userland-proxy": false,
  "experimental": false,
  "metrics-addr": "0.0.0.0:9323",
  "default-runtime": "nvidia",
  "runtimes": {
    "nvidia": {
      "path": "nvidia-container-runtime",
      "runtimeArgs": []
    }
  }
}
EOF

# Restart Docker service
systemctl restart docker
systemctl enable docker

# Test NVIDIA Docker integration
docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu20.04 nvidia-smi
if [ $? -ne 0 ]; then
    echo "NVIDIA Docker integration test failed"
    exit 1
fi

# Install CUDA Toolkit
echo "Installing CUDA Toolkit..."
wget https://developer.download.nvidia.com/compute/cuda/12.3.0/local_installers/cuda_12.3.0_545.23.06_linux.run
chmod +x cuda_12.3.0_545.23.06_linux.run
./cuda_12.3.0_545.23.06_linux.run --silent --toolkit

# Set CUDA environment variables
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> /etc/environment
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> /etc/environment
echo 'export CUDA_HOME=/usr/local/cuda' >> /etc/environment

# Source environment variables
source /etc/environment

# Install cuDNN
echo "Installing cuDNN..."
CUDNN_VERSION="8.9.6.50"
wget https://developer.download.nvidia.com/compute/cudnn/redist/cudnn/linux-x86_64/cudnn-linux-x86_64-${CUDNN_VERSION}_cuda12-archive.tar.xz
tar -xf cudnn-linux-x86_64-${CUDNN_VERSION}_cuda12-archive.tar.xz
cp cudnn-linux-x86_64-${CUDNN_VERSION}_cuda12-archive/include/cudnn*.h /usr/local/cuda/include
cp -P cudnn-linux-x86_64-${CUDNN_VERSION}_cuda12-archive/lib/libcudnn* /usr/local/cuda/lib64
chmod a+r /usr/local/cuda/include/cudnn*.h /usr/local/cuda/lib64/libcudnn*

# Install TensorRT
echo "Installing TensorRT..."
TENSORRT_VERSION="8.6.1.6"
wget https://developer.nvidia.com/downloads/compute/machine-learning/tensorrt/secure/8.6.1/tars/tensorrt-8.6.1.6.linux.x86_64-gnu.cuda-12.0.tar.gz
tar -xzf tensorrt-8.6.1.6.linux.x86_64-gnu.cuda-12.0.tar.gz
cp TensorRT-8.6.1.6/lib/* /usr/local/cuda/lib64/
cp TensorRT-8.6.1.6/include/* /usr/local/cuda/include/
echo '/usr/local/cuda/lib64' > /etc/ld.so.conf.d/tensorrt.conf
ldconfig

# Install Python and AI/ML libraries
yum install -y python3 python3-pip python3-devel
pip3 install --upgrade pip

# Install PyTorch with CUDA support
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install TensorFlow with GPU support
pip3 install tensorflow[and-cuda]

# Install other AI/ML libraries
pip3 install \
    numpy \
    scipy \
    scikit-learn \
    pandas \
    matplotlib \
    seaborn \
    jupyter \
    jupyterlab \
    transformers \
    datasets \
    accelerate \
    bitsandbytes \
    xformers \
    diffusers \
    opencv-python \
    pillow \
    librosa \
    soundfile \
    nltk \
    spacy \
    fastapi \
    uvicorn \
    gradio \
    streamlit

# Install Triton Inference Server client
pip3 install tritonclient[all]

# Configure kubelet extra args for GPU
cat > /etc/kubernetes/kubelet/kubelet-config.json <<EOF
{
  "kind": "KubeletConfiguration",
  "apiVersion": "kubelet.config.k8s.io/v1beta1",
  "address": "0.0.0.0",
  "port": 10250,
  "readOnlyPort": 0,
  "cgroupDriver": "systemd",
  "hairpinMode": "hairpin-veth",
  "serializeImagePulls": false,
  "featureGates": {
    "RotateKubeletServerCertificate": true,
    "DevicePlugins": true
  },
  "protectKernelDefaults": true,
  "clusterDomain": "cluster.local",
  "clusterDNS": ["172.20.0.10"],
  "streamingConnectionIdleTimeout": "4h0m0s",
  "nodeStatusUpdateFrequency": "10s",
  "imageMinimumGCAge": "2m0s",
  "imageGCHighThresholdPercent": 85,
  "imageGCLowThresholdPercent": 80,
  "volumeStatsAggPeriod": "1m0s",
  "systemReserved": {
    "cpu": "200m",
    "memory": "200Mi",
    "ephemeral-storage": "2Gi"
  },
  "kubeReserved": {
    "cpu": "200m",
    "memory": "200Mi",
    "ephemeral-storage": "2Gi"
  },
  "enforceNodeAllocatable": ["pods"]
}
EOF

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Configure CloudWatch agent with GPU metrics
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/ec2/ventaro-ai-gpu/system",
            "log_stream_name": "{instance_id}/messages",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/docker",
            "log_group_name": "/aws/ec2/ventaro-ai-gpu/docker",
            "log_stream_name": "{instance_id}/docker",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/kubelet/kubelet.log",
            "log_group_name": "/aws/ec2/ventaro-ai-gpu/kubelet",
            "log_stream_name": "{instance_id}/kubelet",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nvidia-installer.log",
            "log_group_name": "/aws/ec2/ventaro-ai-gpu/nvidia",
            "log_stream_name": "{instance_id}/nvidia-installer",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Ventaro/AI/GPU",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time",
          "read_bytes",
          "write_bytes",
          "reads",
          "writes"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": [
          "tcp_established",
          "tcp_time_wait"
        ],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": [
          "swap_used_percent"
        ],
        "metrics_collection_interval": 60
      },
      "nvidia_gpu": {
        "measurement": [
          "utilization_gpu",
          "utilization_memory",
          "temperature_gpu",
          "power_draw",
          "memory_total",
          "memory_used",
          "memory_free"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Install NVIDIA GPU Exporter for Prometheus
wget https://github.com/mindprince/nvidia_gpu_prometheus_exporter/releases/download/v0.1.0/nvidia_gpu_prometheus_exporter
chmod +x nvidia_gpu_prometheus_exporter
mv nvidia_gpu_prometheus_exporter /usr/local/bin/

# Create GPU exporter service
cat > /etc/systemd/system/nvidia-gpu-exporter.service <<EOF
[Unit]
Description=NVIDIA GPU Prometheus Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=nobody
Group=nobody
Type=simple
ExecStart=/usr/local/bin/nvidia_gpu_prometheus_exporter -web.listen-address=:9445
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nvidia-gpu-exporter
systemctl start nvidia-gpu-exporter

# Install Node Exporter for Prometheus monitoring
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-1.6.1.linux-amd64*

# Create node_exporter service
cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=nobody
Group=nobody
Type=simple
ExecStart=/usr/local/bin/node_exporter --web.listen-address=:9100
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

# Configure system limits for GPU workloads
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
* soft memlock unlimited
* hard memlock unlimited
EOF

# Configure sysctl parameters for GPU workloads
cat >> /etc/sysctl.conf <<EOF
# Network optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 65536 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr

# File system optimizations
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# Virtual memory optimizations for GPU workloads
vm.swappiness = 1
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.overcommit_memory = 1

# Kernel optimizations
kernel.pid_max = 4194304
kernel.shmmax = 68719476736
kernel.shmall = 4294967296
EOF

sysctl -p

# Install AWS Systems Manager agent
yum install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Install AWS Inspector agent
wget https://inspector-agent.amazonaws.com/linux/latest/install
bash install

# Configure log rotation
cat > /etc/logrotate.d/ventaro-ai-gpu <<EOF
/var/log/ventaro-ai/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 root root
    postrotate
        /bin/systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}

/var/log/nvidia-installer.log {
    weekly
    missingok
    rotate 4
    compress
    delaycompress
    notifempty
    create 0644 root root
}
EOF

# Create ventaro-ai log directory
mkdir -p /var/log/ventaro-ai

# Install and configure fail2ban for security
yum install -y epel-release
yum install -y fail2ban

cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/secure
maxretry = 3
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Configure automatic security updates
yum install -y yum-cron
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/yum/yum-cron.conf
systemctl enable yum-cron
systemctl start yum-cron

# Create GPU health monitoring script
cat > /usr/local/bin/gpu-health-check.sh <<EOF
#!/bin/bash
# GPU health check script for Ventaro AI

echo "=== GPU Health Check ==="
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo

echo "=== NVIDIA Driver Info ==="
nvidia-smi --query-gpu=driver_version --format=csv,noheader,nounits
echo

echo "=== GPU Status ==="
nvidia-smi --query-gpu=index,name,temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,power.draw --format=csv
echo

echo "=== GPU Processes ==="
nvidia-smi pmon -c 1
echo

echo "=== CUDA Version ==="
nvcc --version 2>/dev/null || echo "CUDA not found in PATH"
echo

echo "=== Docker GPU Test ==="
docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu20.04 nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo "Docker GPU test failed"
echo

echo "=== GPU Memory Errors ==="
nvidia-smi --query-gpu=memory.ecc.errors.corrected.total,memory.ecc.errors.uncorrected.total --format=csv
echo

echo "=== GPU Temperature History ==="
nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits | awk '{if($1>80) print "WARNING: High temperature detected: "$1"°C";}'
echo

echo "=== GPU Health Check Complete ==="
EOF

chmod +x /usr/local/bin/gpu-health-check.sh

# Create a comprehensive node health check script
cat > /usr/local/bin/node-health-check.sh <<EOF
#!/bin/bash
# Node health check script for Ventaro AI GPU nodes

echo "=== Node Health Check ==="
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime)"
echo

echo "=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4"%"}')
echo "Memory Usage:"
free -h
echo "Disk Usage:"
df -h
echo

echo "=== Docker Status ==="
systemctl is-active docker
docker info --format '{{.ServerVersion}}'
echo

echo "=== Kubelet Status ==="
systemctl is-active kubelet
echo

echo "=== Node Exporter Status ==="
systemctl is-active node_exporter
echo

echo "=== GPU Exporter Status ==="
systemctl is-active nvidia-gpu-exporter
echo

echo "=== CloudWatch Agent Status ==="
systemctl is-active amazon-cloudwatch-agent
echo

echo "=== Network Connectivity ==="
ping -c 3 8.8.8.8 > /dev/null && echo "Internet: OK" || echo "Internet: FAILED"
ping -c 3 $CLUSTER_ENDPOINT > /dev/null && echo "EKS Endpoint: OK" || echo "EKS Endpoint: FAILED"
echo

echo "=== Security Services ==="
systemctl is-active fail2ban
systemctl is-active amazon-ssm-agent
echo

echo "=== GPU Health ==="
/usr/local/bin/gpu-health-check.sh
echo

echo "=== Log Files ==="
echo "Recent errors in system logs:"
tail -n 10 /var/log/messages | grep -i error || echo "No recent errors"
echo "Recent NVIDIA errors:"
tail -n 10 /var/log/nvidia-installer.log | grep -i error || echo "No recent NVIDIA errors"
echo

echo "=== Health Check Complete ==="
EOF

chmod +x /usr/local/bin/node-health-check.sh

# Create cron jobs for regular health checks
echo "0 */6 * * * root /usr/local/bin/node-health-check.sh >> /var/log/ventaro-ai/health-check.log 2>&1" >> /etc/crontab
echo "*/15 * * * * root /usr/local/bin/gpu-health-check.sh >> /var/log/ventaro-ai/gpu-health.log 2>&1" >> /etc/crontab

# Create GPU temperature monitoring script
cat > /usr/local/bin/gpu-temp-monitor.sh <<EOF
#!/bin/bash
# GPU temperature monitoring script

TEMP_THRESHOLD=85
CRITICAL_THRESHOLD=90

while true; do
    TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits)
    
    if [ $TEMP -gt $CRITICAL_THRESHOLD ]; then
        echo "CRITICAL: GPU temperature is ${TEMP}°C (threshold: ${CRITICAL_THRESHOLD}°C)" | logger -t gpu-monitor
        # Could trigger emergency cooling or workload reduction here
    elif [ $TEMP -gt $TEMP_THRESHOLD ]; then
        echo "WARNING: GPU temperature is ${TEMP}°C (threshold: ${TEMP_THRESHOLD}°C)" | logger -t gpu-monitor
    fi
    
    sleep 60
done
EOF

chmod +x /usr/local/bin/gpu-temp-monitor.sh

# Create systemd service for GPU temperature monitoring
cat > /etc/systemd/system/gpu-temp-monitor.service <<EOF
[Unit]
Description=GPU Temperature Monitor
After=multi-user.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/gpu-temp-monitor.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gpu-temp-monitor
systemctl start gpu-temp-monitor

# Bootstrap the node to join the EKS cluster
/etc/eks/bootstrap.sh $CLUSTER_NAME $BOOTSTRAP_ARGUMENTS

# Wait for kubelet to be ready
echo "Waiting for kubelet to be ready..."
while ! systemctl is-active --quiet kubelet; do
    sleep 5
done

# Label the node as GPU-enabled
echo "Labeling node as GPU-enabled..."
kubectl label node $(hostname) node-type=gpu --overwrite
kubectl label node $(hostname) nvidia.com/gpu=true --overwrite
kubectl label node $(hostname) accelerator=nvidia-tesla --overwrite

# Add taints for GPU workloads
kubectl taint node $(hostname) nvidia.com/gpu=true:NoSchedule --overwrite

# Signal that the instance is ready
/opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource AutoScalingGroup --region ${AWS::Region}

echo "Ventaro AI GPU EKS node bootstrap completed successfully"
echo "Node joined cluster: $CLUSTER_NAME"
echo "Bootstrap arguments: $BOOTSTRAP_ARGUMENTS"
echo "NVIDIA Driver version: $(nvidia-smi --query-gpu=driver_version --format=csv,noheader,nounits)"
echo "CUDA version: $(nvcc --version | grep release | awk '{print $6}' | cut -c2-)"
echo "GPU count: $(nvidia-smi --list-gpus | wc -l)"
echo "Timestamp: $(date)"