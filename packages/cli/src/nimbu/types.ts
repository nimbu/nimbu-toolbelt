type ACLScope = 'none' | 'private' | 'public' | 'shared'

export type ChannelACL = {
  create: ACLScope
  delete: ACLScope
  read: ACLScope
  update: ACLScope
}

export type ChannelEntryACL = {
  [k: string]: {
    create?: boolean
    delete?: boolean
    read?: boolean
    update?: boolean
  }
}

export enum FieldType {
  BELONGS_TO = 'belongs_to',
  BELONGS_TO_MANY = 'belongs_to_many',
  BOOLEAN = 'boolean',
  CALCULATED = 'calculated',
  CUSTOMER = 'customer',
  DATE = 'date',
  DATE_TIME = 'date_time',
  EMAIL = 'email',
  FILE = 'file',
  FLOAT = 'float',
  GALLERY = 'gallery',
  GEO = 'geo',
  INTEGER = 'integer',
  JSON = 'json',
  MULTI_SELECT = 'multi_select',
  SELECT = 'select',
  STRING = 'string',
  TEXT = 'text',
  TIME = 'time',
}

export type GeoType =
  | 'Coordinate'
  | 'Geometry'
  | 'GeometryCollection'
  | 'Line'
  | 'LineString'
  | 'MultiLineString'
  | 'MultiPoint'
  | 'MultiPolygon'
  | 'Point'
  | 'Polygon'
  | 'Rect'
  | 'Triangle'

export type SelectOption = {
  id: string
  name: string
  position: number
  slug: string
}

interface BaseNimbuObject extends Record<string, unknown> {
  created_at: Date
  id: string
  updated_at: Date
}
interface BaseCustomField extends BaseNimbuObject {
  encrypted: boolean
  hint: null | string
  label: string
  localized: boolean
  name: string
  required: boolean
  required_expression?: string
  type: FieldType
  unique: boolean
}

export interface RegularField extends BaseCustomField {
  type:
    | FieldType.BOOLEAN
    | FieldType.CUSTOMER
    | FieldType.DATE
    | FieldType.DATE_TIME
    | FieldType.EMAIL
    | FieldType.FLOAT
    | FieldType.GALLERY
    | FieldType.INTEGER
    | FieldType.JSON
    | FieldType.STRING
    | FieldType.TEXT
    | FieldType.TIME
}

export function isRegularField(field: CustomField): field is RegularField {
  return (
    field.type === FieldType.STRING ||
    field.type === FieldType.TEXT ||
    field.type === FieldType.EMAIL ||
    field.type === FieldType.INTEGER ||
    field.type === FieldType.FLOAT ||
    field.type === FieldType.BOOLEAN ||
    field.type === FieldType.DATE ||
    field.type === FieldType.TIME ||
    field.type === FieldType.DATE_TIME ||
    field.type === FieldType.CUSTOMER ||
    field.type === FieldType.GALLERY ||
    field.type === FieldType.JSON
  )
}

export interface RelationalField extends BaseCustomField {
  reference: string
  type: FieldType.BELONGS_TO | FieldType.BELONGS_TO_MANY
}

export function isRelationalField(field: CustomField): field is RelationalField {
  return field.type === FieldType.BELONGS_TO || field.type === FieldType.BELONGS_TO_MANY
}

export interface SelectField extends BaseCustomField {
  select_options: SelectOption[]
  type: FieldType.MULTI_SELECT | FieldType.SELECT
}

export function isSelectField(field: CustomField): field is SelectField {
  return field.type === FieldType.SELECT || field.type === FieldType.MULTI_SELECT
}

export interface GeoField extends BaseCustomField {
  geo_type: GeoType
  type: FieldType.GEO
}

export function isGeoField(field: CustomField): field is GeoField {
  return field.type === FieldType.GEO
}

export interface CalculatedField extends BaseCustomField {
  calculated_expression: string
  calculation_type: 'float' | 'integer' | 'string'
  type: FieldType.CALCULATED
}

export function isCalculatedField(field: CustomField): field is CalculatedField {
  return field.type === FieldType.CALCULATED
}

export interface FileField extends BaseCustomField {
  private_storage: boolean
  type: FieldType.FILE
}

export function isFileField(field: CustomField): field is FileField {
  return field.type === FieldType.FILE
}

export type CustomField = CalculatedField | FileField | GeoField | RegularField | RelationalField | SelectField

export function isFieldOf(
  type:
    | FieldType.BOOLEAN
    | FieldType.CUSTOMER
    | FieldType.DATE
    | FieldType.DATE_TIME
    | FieldType.EMAIL
    | FieldType.FLOAT
    | FieldType.GALLERY
    | FieldType.INTEGER
    | FieldType.JSON
    | FieldType.STRING
    | FieldType.TEXT
    | FieldType.TIME,
): (field: CustomField) => field is RegularField

export function isFieldOf(
  type: FieldType.BELONGS_TO | FieldType.BELONGS_TO_MANY,
): (field: CustomField) => field is RelationalField

export function isFieldOf(type: FieldType.FILE): (field: CustomField) => field is FileField
export function isFieldOf(type: FieldType.CALCULATED): (field: CustomField) => field is CalculatedField
export function isFieldOf(type: FieldType.GEO): (field: CustomField) => field is GeoField
export function isFieldOf(type: FieldType.MULTI_SELECT | FieldType.SELECT): (field: CustomField) => field is SelectField

export function isFieldOf(type: FieldType) {
  return function (field: CustomField): field is CustomField {
    return field.type === type
  }
}

export interface Channel extends BaseNimbuObject {
  acl: ChannelACL
  customizations: CustomField[]
  description: null | string
  entries_url: string
  label_field: string
  name: string
  order_by: string
  order_direction: 'asc' | 'desc'
  rss_enabled: boolean
  slug: string
  submittable: boolean
  title_field: string
  url: string
}

export interface ChannelEntry extends BaseNimbuObject {
  [k: string]: any
  _acl: ChannelEntryACL
  _owner?: string
  short_id: string
  slug: string
  url: string
}

export type ChannelEntryReferenceSingle = {
  __type: 'Reference'
  className: string
  id: string
  slug?: string
}

export type ChannelEntryReferenceMany = {
  __type: 'Relation'
  className: string
  objects: ChannelEntryReferenceSingle[]
}

type BaseChannelEntryFile = {
  __type: 'File'
  content_type: string
  filename: string
  height: number
  private: false
  size: number
  url: string
  version: string
  width: number
}

type BaseChannelEntryPrivateFile = BaseChannelEntryFile & {
  permanent_backend_url: string
  permanent_relative_url: string
  permanent_url: string
  private: true
}

export type ChannelEntryFile = BaseChannelEntryFile | BaseChannelEntryPrivateFile

export interface Customer extends BaseNimbuObject {
  [k: string]: any
  email: string
  firstname: string
  groups: string[]
  language: string
  lastname: string
  name: string
  number: number
  slug: string
  status: string
}
