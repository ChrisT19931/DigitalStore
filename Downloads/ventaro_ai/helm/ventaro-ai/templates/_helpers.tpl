{{/*
Expand the name of the chart.
*/}}
{{- define "ventaro-ai.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "ventaro-ai.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ventaro-ai.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ventaro-ai.labels" -}}
helm.sh/chart: {{ include "ventaro-ai.chart" . }}
{{ include "ventaro-ai.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: ventaro-ai
app.kubernetes.io/created-by: helm
app.kubernetes.io/environment: {{ .Values.global.environment | default "production" }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ventaro-ai.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ventaro-ai.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "ventaro-ai.serviceAccountName" -}}
{{- if .Values.security.serviceAccount.create }}
{{- default (include "ventaro-ai.fullname" .) .Values.security.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.security.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the cluster role to use
*/}}
{{- define "ventaro-ai.clusterRoleName" -}}
{{- if .Values.security.rbac.create }}
{{- printf "%s-cluster-role" (include "ventaro-ai.fullname" .) }}
{{- else }}
{{- "default" }}
{{- end }}
{{- end }}

{{/*
Create the name of the cluster role binding to use
*/}}
{{- define "ventaro-ai.clusterRoleBindingName" -}}
{{- if .Values.security.rbac.create }}
{{- printf "%s-cluster-role-binding" (include "ventaro-ai.fullname" .) }}
{{- else }}
{{- "default" }}
{{- end }}
{{- end }}

{{/*
Create the name of the role to use
*/}}
{{- define "ventaro-ai.roleName" -}}
{{- if .Values.security.rbac.create }}
{{- printf "%s-role" (include "ventaro-ai.fullname" .) }}
{{- else }}
{{- "default" }}
{{- end }}
{{- end }}

{{/*
Create the name of the role binding to use
*/}}
{{- define "ventaro-ai.roleBindingName" -}}
{{- if .Values.security.rbac.create }}
{{- printf "%s-role-binding" (include "ventaro-ai.fullname" .) }}
{{- else }}
{{- "default" }}
{{- end }}
{{- end }}

{{/*
Generate certificates for webhook
*/}}
{{- define "ventaro-ai.gen-certs" -}}
{{- $altNames := list ( printf "%s.%s" (include "ventaro-ai.name" .) .Release.Namespace ) ( printf "%s.%s.svc" (include "ventaro-ai.name" .) .Release.Namespace ) -}}
{{- $ca := genCA "ventaro-ai-ca" 365 -}}
{{- $cert := genSignedCert ( include "ventaro-ai.name" . ) nil $altNames 365 $ca -}}
tls.crt: {{ $cert.Cert | b64enc }}
tls.key: {{ $cert.Key | b64enc }}
ca.crt: {{ $ca.Cert | b64enc }}
{{- end }}

{{/*
Return the proper image name
*/}}
{{- define "ventaro-ai.image" -}}
{{- $registryName := .imageRoot.registry -}}
{{- $repositoryName := .imageRoot.repository -}}
{{- $tag := .imageRoot.tag | toString -}}
{{- if .global }}
    {{- if .global.imageRegistry }}
        {{- $registryName = .global.imageRegistry -}}
    {{- end -}}
{{- end -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else -}}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end -}}
{{- end }}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "ventaro-ai.imagePullSecrets" -}}
{{- $pullSecrets := list }}
{{- if .global }}
    {{- range .global.imagePullSecrets -}}
        {{- $pullSecrets = append $pullSecrets . -}}
    {{- end -}}
{{- end -}}
{{- range .images.pullSecrets -}}
    {{- $pullSecrets = append $pullSecrets . -}}
{{- end -}}
{{- if (not (empty $pullSecrets)) }}
imagePullSecrets:
{{- range $pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Return the proper Storage Class
*/}}
{{- define "ventaro-ai.storageClass" -}}
{{- $storageClass := .persistence.storageClass -}}
{{- if .global -}}
    {{- if .global.storageClass -}}
        {{- $storageClass = .global.storageClass -}}
    {{- end -}}
{{- end -}}
{{- if $storageClass -}}
  storageClassName: {{ $storageClass | quote }}
{{- end -}}
{{- end }}

{{/*
Validate values of Ventaro AI
*/}}
{{- define "ventaro-ai.validateValues" -}}
{{- $messages := list -}}
{{- $messages := append $messages (include "ventaro-ai.validateValues.database" .) -}}
{{- $messages := append $messages (include "ventaro-ai.validateValues.ingress" .) -}}
{{- $messages := append $messages (include "ventaro-ai.validateValues.resources" .) -}}
{{- $messages := without $messages "" -}}
{{- $message := join "\n" $messages -}}
{{- if $message -}}
{{-   printf "\nVALUES VALIDATION:\n%s" $message | fail -}}
{{- end -}}
{{- end -}}

{{/*
Validate values of Ventaro AI - Database
*/}}
{{- define "ventaro-ai.validateValues.database" -}}
{{- if and (not .Values.databases.postgresql.enabled) (not .Values.databases.mongodb.enabled) -}}
ventaro-ai: database
    At least one database must be enabled (PostgreSQL or MongoDB).
    Please enable either:
      - databases.postgresql.enabled=true
      - databases.mongodb.enabled=true
{{- end -}}
{{- end -}}

{{/*
Validate values of Ventaro AI - Ingress
*/}}
{{- define "ventaro-ai.validateValues.ingress" -}}
{{- if and .Values.ingress.enabled (not .Values.ingress.className) -}}
ventaro-ai: ingress
    Ingress is enabled but no ingress class is specified.
    Please set ingress.className (e.g., "nginx", "traefik").
{{- end -}}
{{- end -}}

{{/*
Validate values of Ventaro AI - Resources
*/}}
{{- define "ventaro-ai.validateValues.resources" -}}
{{- if and .Values.aiProcessor.enabled .Values.aiProcessor.gpu.enabled (not .Values.aiProcessor.resources.limits) -}}
ventaro-ai: resources
    AI Processor with GPU is enabled but no resource limits are specified.
    Please set aiProcessor.resources.limits including GPU resources.
{{- end -}}
{{- end -}}

{{/*
Generate environment variables from ConfigMap
*/}}
{{- define "ventaro-ai.envFromConfigMap" -}}
{{- range $configMapName := .configMaps }}
- configMapRef:
    name: {{ include "ventaro-ai.fullname" $ }}-{{ $configMapName }}
{{- end }}
{{- end }}

{{/*
Generate environment variables from Secret
*/}}
{{- define "ventaro-ai.envFromSecret" -}}
{{- range $secretName := .secrets }}
- secretRef:
    name: {{ include "ventaro-ai.fullname" $ }}-{{ $secretName }}
{{- end }}
{{- end }}

{{/*
Generate database connection URL for PostgreSQL
*/}}
{{- define "ventaro-ai.postgresql.url" -}}
{{- if .Values.databases.postgresql.enabled -}}
{{- $host := printf "%s-postgresql" (include "ventaro-ai.fullname" .) -}}
{{- $port := .Values.databases.postgresql.primary.service.ports.postgresql | default 5432 -}}
{{- $database := .Values.databases.postgresql.auth.database -}}
{{- $username := .Values.databases.postgresql.auth.username -}}
{{- printf "postgresql://%s:${POSTGRES_PASSWORD}@%s:%v/%s" $username $host $port $database -}}
{{- end -}}
{{- end }}

{{/*
Generate database connection URL for MongoDB
*/}}
{{- define "ventaro-ai.mongodb.url" -}}
{{- if .Values.databases.mongodb.enabled -}}
{{- $host := printf "%s-mongodb" (include "ventaro-ai.fullname" .) -}}
{{- $port := .Values.databases.mongodb.service.ports.mongodb | default 27017 -}}
{{- $database := .Values.databases.mongodb.auth.database -}}
{{- $username := .Values.databases.mongodb.auth.username -}}
{{- printf "mongodb://%s:${MONGODB_PASSWORD}@%s:%v/%s" $username $host $port $database -}}
{{- end -}}
{{- end }}

{{/*
Generate Redis connection URL
*/}}
{{- define "ventaro-ai.redis.url" -}}
{{- if .Values.databases.redis.enabled -}}
{{- $host := printf "%s-redis-master" (include "ventaro-ai.fullname" .) -}}
{{- $port := .Values.databases.redis.master.service.ports.redis | default 6379 -}}
{{- if .Values.databases.redis.auth.enabled -}}
{{- printf "redis://:${REDIS_PASSWORD}@%s:%v" $host $port -}}
{{- else -}}
{{- printf "redis://%s:%v" $host $port -}}
{{- end -}}
{{- end -}}
{{- end }}

{{/*
Generate InfluxDB connection URL
*/}}
{{- define "ventaro-ai.influxdb.url" -}}
{{- if .Values.databases.influxdb.enabled -}}
{{- $host := printf "%s-influxdb" (include "ventaro-ai.fullname" .) -}}
{{- $port := .Values.databases.influxdb.service.ports.http | default 8086 -}}
{{- printf "http://%s:%v" $host $port -}}
{{- end -}}
{{- end }}

{{/*
Generate resource requirements
*/}}
{{- define "ventaro-ai.resources" -}}
{{- if .resources -}}
resources:
  {{- if .resources.limits }}
  limits:
    {{- range $key, $value := .resources.limits }}
    {{ $key }}: {{ $value | quote }}
    {{- end }}
  {{- end }}
  {{- if .resources.requests }}
  requests:
    {{- range $key, $value := .resources.requests }}
    {{ $key }}: {{ $value | quote }}
    {{- end }}
  {{- end }}
{{- end -}}
{{- end }}

{{/*
Generate node selector
*/}}
{{- define "ventaro-ai.nodeSelector" -}}
{{- if .nodeSelector }}
nodeSelector:
  {{- range $key, $value := .nodeSelector }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
{{- end }}
{{- end }}

{{/*
Generate tolerations
*/}}
{{- define "ventaro-ai.tolerations" -}}
{{- if .tolerations }}
tolerations:
  {{- toYaml .tolerations | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate affinity
*/}}
{{- define "ventaro-ai.affinity" -}}
{{- if .affinity }}
affinity:
  {{- toYaml .affinity | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate security context
*/}}
{{- define "ventaro-ai.securityContext" -}}
{{- if .securityContext }}
securityContext:
  {{- toYaml .securityContext | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate pod security context
*/}}
{{- define "ventaro-ai.podSecurityContext" -}}
{{- if .podSecurityContext }}
securityContext:
  {{- toYaml .podSecurityContext | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate volume mounts
*/}}
{{- define "ventaro-ai.volumeMounts" -}}
{{- if .volumeMounts }}
volumeMounts:
  {{- toYaml .volumeMounts | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate volumes
*/}}
{{- define "ventaro-ai.volumes" -}}
{{- if .volumes }}
volumes:
  {{- toYaml .volumes | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate probe configuration
*/}}
{{- define "ventaro-ai.probe" -}}
{{- if .probe }}
{{- if .probe.httpGet }}
httpGet:
  path: {{ .probe.httpGet.path }}
  port: {{ .probe.httpGet.port }}
  {{- if .probe.httpGet.scheme }}
  scheme: {{ .probe.httpGet.scheme }}
  {{- end }}
  {{- if .probe.httpGet.httpHeaders }}
  httpHeaders:
    {{- toYaml .probe.httpGet.httpHeaders | nindent 4 }}
  {{- end }}
{{- else if .probe.tcpSocket }}
tcpSocket:
  port: {{ .probe.tcpSocket.port }}
  {{- if .probe.tcpSocket.host }}
  host: {{ .probe.tcpSocket.host }}
  {{- end }}
{{- else if .probe.exec }}
exec:
  command:
    {{- toYaml .probe.exec.command | nindent 4 }}
{{- end }}
initialDelaySeconds: {{ .probe.initialDelaySeconds | default 30 }}
periodSeconds: {{ .probe.periodSeconds | default 10 }}
timeoutSeconds: {{ .probe.timeoutSeconds | default 5 }}
failureThreshold: {{ .probe.failureThreshold | default 3 }}
{{- if .probe.successThreshold }}
successThreshold: {{ .probe.successThreshold }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate common annotations
*/}}
{{- define "ventaro-ai.commonAnnotations" -}}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "ventaro-ai.chart" . }}
ventaro.ai/release: {{ .Release.Name }}
ventaro.ai/environment: {{ .Values.global.environment | default "production" }}
{{- if .Values.global.domain }}
ventaro.ai/domain: {{ .Values.global.domain }}
{{- end }}
{{- end }}

{{/*
Generate common pod annotations
*/}}
{{- define "ventaro-ai.podAnnotations" -}}
prometheus.io/scrape: "true"
prometheus.io/port: "9090"
prometheus.io/path: "/metrics"
ventaro.ai/config-hash: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum | trunc 8 }}
ventaro.ai/secret-hash: {{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum | trunc 8 }}
{{- end }}

{{/*
Generate backup annotations
*/}}
{{- define "ventaro-ai.backupAnnotations" -}}
{{- if .Values.backup.enabled }}
backup.velero.io/backup-volumes: "data"
backup.velero.io/backup-volumes-excludes: "tmp,cache"
{{- end }}
{{- end }}

{{/*
Generate monitoring labels
*/}}
{{- define "ventaro-ai.monitoringLabels" -}}
monitoring: "true"
prometheus: "true"
ventaro.ai/metrics: "enabled"
{{- end }}

{{/*
Generate network policy labels
*/}}
{{- define "ventaro-ai.networkPolicyLabels" -}}
network-policy: "enabled"
ventaro.ai/network-access: "restricted"
{{- end }}

{{/*
Generate feature flags as environment variables
*/}}
{{- define "ventaro-ai.featureFlags" -}}
{{- if .Values.features }}
- name: FEATURE_AI_ENABLED
  value: {{ .Values.features.ai.enabled | quote }}
- name: FEATURE_IOT_ENABLED
  value: {{ .Values.features.iot.enabled | quote }}
- name: FEATURE_EDGE_ENABLED
  value: {{ .Values.features.edge.enabled | quote }}
- name: FEATURE_BLOCKCHAIN_ENABLED
  value: {{ .Values.features.blockchain.enabled | quote }}
- name: FEATURE_AR_VR_ENABLED
  value: {{ .Values.features.ar_vr.enabled | quote }}
{{- end }}
{{- end }}