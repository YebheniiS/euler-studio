import { CosmosClient } from '@azure/cosmos';

const endpoint = 'https://studio-db.documents.azure.com:443';
const key =
	'9DOTVE9aUt1GiXT1hpCl9dcVKtpEUQRs6dWyWNPod6Sh0OSNg726rhMRJRaWEQRBBo6KwluwpHjeACDbiv2VMQ==';

const cosmosDbClient = new CosmosClient({ endpoint, key });

export { cosmosDbClient };
