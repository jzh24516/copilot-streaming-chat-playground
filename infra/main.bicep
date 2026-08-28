// Azure infrastructure for the Dynamics 365 side-pane assistant.
//
// Deploys a single Linux App Service that serves both the pane widget and the
// Copilot Studio `/3p` relay from one HTTPS origin, so the widget can call its
// API with same-origin relative paths and no CORS policy is required.
//
// Deploy:
//   az group create -n <rg> -l <location>
//   az deployment group create -g <rg> -f infra/main.bicep -p @infra/main.parameters.json

targetScope = 'resourceGroup'

@description('Globally unique name for the Web App. Becomes https://<name>.azurewebsites.net.')
// Capped at 50 so the derived '<appName>-logs' / '<appName>-insights' names stay
// inside the 63-character Log Analytics limit.
@minLength(2)
@maxLength(50)
param appName string

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('App Service plan SKU. B1 is the smallest tier that supports Always On.')
@allowed(['B1', 'B2', 'B3', 'P0v3', 'P1v3', 'P2v3'])
param skuName string = 'B1'

@description('Entra tenant that hosts the users and the agent.')
param paneTenantId string

@description('Entra SPA application ID the pane signs users in with.')
param paneClientId string

@description('Copilot Studio environment ID that contains the published agent.')
param paneEnvironmentId string

@description('Copilot Studio agent schema name. Case sensitive.')
param paneSchemaName string

@description('Dynamics origins allowed to frame the pane, e.g. https://contoso.crm.dynamics.com. Comma separated.')
param paneDynamicsOrigins string

@description('Label shown in the pane header.')
param paneAgentDisplayName string = 'AI assistant'

var logAnalyticsName = '${appName}-logs'
var appInsightsName = '${appName}-insights'
var planName = '${appName}-plan'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    // The pane carries business conversation content. Keep telemetry inside the
    // workspace rather than allowing public ingestion/query paths.
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: skuName
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  identity: {
    // Present so secrets can move to Key Vault references without redeploying
    // the app's identity model later.
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/healthz'
      appCommandLine: 'node server.js'
      // The relay streams NDJSON. Compression middleware is not enabled in the
      // app, and no proxy-level buffering is introduced here, so chunks reach
      // the browser as they are produced.
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          // Raw capture writes prompts and responses to the log. Never on in a
          // deployed environment.
          name: 'DTE_RAW_CAPTURE'
          value: '0'
        }
        {
          name: 'PANE_TENANT_ID'
          value: paneTenantId
        }
        {
          name: 'PANE_CLIENT_ID'
          value: paneClientId
        }
        {
          name: 'PANE_ENVIRONMENT_ID'
          value: paneEnvironmentId
        }
        {
          name: 'PANE_SCHEMA_NAME'
          value: paneSchemaName
        }
        {
          name: 'PANE_DYNAMICS_ORIGINS'
          value: paneDynamicsOrigins
        }
        {
          name: 'PANE_AGENT_DISPLAY_NAME'
          value: paneAgentDisplayName
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
      ]
    }
  }
}

@description('Public origin of the deployed pane. Use this in the launcher web resource and as the Entra SPA redirect URI base.')
output widgetOrigin string = 'https://${site.properties.defaultHostName}'

@description('Exact SPA redirect URI to register on the Entra application.')
output spaRedirectUri string = 'https://${site.properties.defaultHostName}/crm-pane'

@description('URL to embed from the Dynamics launcher web resource.')
output paneUrl string = 'https://${site.properties.defaultHostName}/crm-pane'

output webAppName string = site.name
