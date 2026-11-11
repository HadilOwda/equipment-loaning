import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { PeriodType, RequestStatus } from './constants'
import { ADMIN_GROUP } from './../auth/constants';
import { getUserDisplayNames } from '../functions/resource';

const schema = a.schema({
  RequestStatusEnum: a.enum(Object.values(RequestStatus)),
  Period: a.model({
    id: a.id().required(),
    name: a.string().required(),
    periodType: a.enum(Object.values(PeriodType)),
    startDateTime: a.datetime().required(),
    endDateTime: a.datetime().required(),
    acceptingRequests: a.boolean().required(),

    loanableEquipment: a.hasMany('PeriodEquipment', 'periodId'),
    requests: a.hasMany('Request', 'periodId')
  })
    .authorization(allow => [
      allow.group(ADMIN_GROUP),
      allow.authenticated().to(['get', 'list'])
    ]),

  Request: a.model({
    // Set automatically to the creating user. Students can read it but never change it.
    owner: a.string().authorization(allow => [
      allow.owner().to(['read', 'delete']),
      allow.group(ADMIN_GROUP)
    ]),

    id: a.id().required()
      .authorization(allow => [
        allow.owner(),
        allow.group(ADMIN_GROUP)
      ]),

    // Students may edit their collateral description
    collateralDescription: a.string().required()
      .authorization(allow => [
        allow.owner(),
        allow.group(ADMIN_GROUP)
      ]),

    // Set once when the request is created; students cannot move it to another period
    periodId: a.id().required()
      .authorization(allow => [
        allow.owner().to(['create', 'read', 'delete']),
        allow.group(ADMIN_GROUP)
      ]),
    period: a.belongsTo('Period', 'periodId')
      .authorization(allow => [
        allow.owner(),
        allow.group(ADMIN_GROUP)
      ]),

    equipmentTypeRequests: a.hasMany('EquipmentTypeRequest', 'requestId')
      .authorization(allow => [
        allow.owner(),
        allow.group(ADMIN_GROUP)
      ]),

    // Admin only. Students can read these but never set them. Students need 'delete' here
    // because AppSync refuses to delete a record unless the caller may delete every
    // field-protected field on it (they could clear, but never set, these via the API).
    // (`status` uses a.ref so that field-level authorization can be applied to it.)
    status: a.ref('RequestStatusEnum')
      .authorization(allow => [
        allow.group(ADMIN_GROUP),
        allow.owner().to(['read', 'delete'])
      ]),

    assignmentId: a.id()
      .authorization(allow => [
        allow.group(ADMIN_GROUP),
        allow.owner().to(['read', 'delete'])
      ]),
    assignment: a.belongsTo('Equipment', 'assignmentId'),

    pastAssignmentId: a.id()
      .authorization(allow => [
        allow.group(ADMIN_GROUP),
        allow.owner().to(['read', 'delete'])
      ]),
    pastAssignment: a.belongsTo('Equipment', 'pastAssignmentId')
  })
    // Default for the model as a whole: students can read and cancel (delete) their own
    // requests. Updates are controlled per field above, so any field added later without
    // its own rule stays read-only for students.
    .authorization(allow => [
      allow.owner().to(['get', 'list', 'delete']),
      allow.group(ADMIN_GROUP)
    ]),

  EquipmentType: a.model({
    id: a.id().required(),
    name: a.string().required(),
    equipments: a.hasMany('Equipment', 'equipmentTypeId'),
    equipmentTypeRequests: a.hasMany('EquipmentTypeRequest', 'equipmentTypeId')
  })
    .authorization(allow => [
      allow.group(ADMIN_GROUP),
      allow.authenticated().to(['get', 'list'])
    ]),

  PeriodEquipment: a.model({
    periodId: a.id().required(),
    equipmentId: a.id().required(),

    period: a.belongsTo('Period', 'periodId'),
    equipment: a.belongsTo('Equipment', 'equipmentId'),
  })
    .identifier(['equipmentId', 'periodId'])
    .authorization(allow => [
      allow.group(ADMIN_GROUP),
      allow.authenticated().to(['get', 'list'])
    ]),

  Equipment: a.model({
    id: a.id().required(),  // used as physical identifier
    accessories: a.string().array(),
    notes: a.string(),

    equipmentTypeId: a.id().required(),
    equipmentType: a.belongsTo('EquipmentType', 'equipmentTypeId'),

    periods: a.hasMany('PeriodEquipment', 'equipmentId'),
    assignment: a.hasOne('Request', 'assignmentId'),
    pastAssignments: a.hasMany('Request', 'pastAssignmentId')
  })
    .authorization(allow => [
      allow.group(ADMIN_GROUP),
      allow.authenticated().to(['get', 'list'])
    ]),

  EquipmentTypeRequest: a.model({
    equipmentTypeId: a.id().required(),
    requestId: a.id().required(),
    rank: a.integer(),  // optional, for MATCH periods

    equipmentType: a.belongsTo('EquipmentType', 'equipmentTypeId'),
    request: a.belongsTo('Request', 'requestId')
  })
    .identifier(['equipmentTypeId', 'requestId'])
    .authorization(allow => [
      allow.owner(),
      allow.group(ADMIN_GROUP)
    ]),


  usernameToDisplayName: a.customType({
    username: a.string(),
    displayName: a.string()
  }),

  getUserDisplayNames: a.query()
    .arguments({
      usernames: a.string().required().array().required(),
    })
    .returns(a.ref('usernameToDisplayName').array())
    .authorization(allow => [allow.group(ADMIN_GROUP)])
    .handler(a.handler.function(getUserDisplayNames))
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
