// server/models/index.js
import Organization from './Organization.js';
import Client from './Client.js';
import Role from './Role.js';
import UserOrganizationMap from './UserOrganizationMap.js';

Organization.hasMany(Client, { foreignKey: 'organization_id', as: 'clients' });
Client.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Client.hasMany(Role, { foreignKey: 'client_id', as: 'roles' });
Role.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

UserOrganizationMap.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
UserOrganizationMap.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
UserOrganizationMap.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

export { Organization, Client, Role, UserOrganizationMap };
