type ACLScope = 'public' | 'shared' | 'private' | 'none'

export type ChannelACL = {
  create: ACLScope
  read: ACLScope
  update: ACLScope
  delete: ACLScope
}

export type ChannelEntryACL = {
  [k: string]: {
    create?: boolean
    read?: boolean
    update?: boolean
    delete?: boolean
  }
}

export enum FieldType {
  STRING = 'string',
  TEXT = 'text',
  EMAIL = 'email',
  INTEGER = 'integer',
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  FILE = 'file',
  DATE = 'date',
  TIME = 'time',
  DATE_TIME = 'date_time',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  CALCULATED = 'calculated',
  BELONGS_TO = 'belongs_to',
  BELONGS_TO_MANY = 'belongs_to_many',
  CUSTOMER = 'customer',
  GALLERY = 'gallery',
  GEO = 'geo',
  JSON = 'json',
}

export type GeoType =
  | 'Coordinate'
  | 'Point'
  | 'MultiPoint'
  | 'Line'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'Rect'
  | 'Triangle'
  | 'GeometryCollection'
  | 'Geometry'

export type SelectOption = {
  id: string
  position: number
  name: string
  slug: string
}

interface BaseNimbuObject extends Record<string, unknown> {
  id: string
  created_at: Date
  updated_at: Date
}
interface BaseCustomField extends BaseNimbuObject {
  hint: string | null
  label: string
  localized: boolean
  unique: boolean
  encrypted: boolean
  name: string
  required: boolean
  required_expression?: string
  type: FieldType
}

export interface RegularField extends BaseCustomField {
  type:
    | FieldType.STRING
    | FieldType.TEXT
    | FieldType.EMAIL
    | FieldType.INTEGER
    | FieldType.FLOAT
    | FieldType.BOOLEAN
    | FieldType.DATE
    | FieldType.TIME
    | FieldType.DATE_TIME
    | FieldType.CUSTOMER
    | FieldType.GALLERY
    | FieldType.JSON
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
  type: FieldType.BELONGS_TO | FieldType.BELONGS_TO_MANY
  reference: string
}

export function isRelationalField(field: CustomField): field is RelationalField {
  return field.type === FieldType.BELONGS_TO || field.type === FieldType.BELONGS_TO_MANY
}

export interface SelectField extends BaseCustomField {
  type: FieldType.SELECT | FieldType.MULTI_SELECT
  select_options: SelectOption[]
}

export function isSelectField(field: CustomField): field is SelectField {
  return field.type === FieldType.SELECT || field.type === FieldType.MULTI_SELECT
}

export interface GeoField extends BaseCustomField {
  type: FieldType.GEO
  geo_type: GeoType
}

export function isGeoField(field: CustomField): field is GeoField {
  return field.type === FieldType.GEO
}

export interface CalculatedField extends BaseCustomField {
  type: FieldType.CALCULATED
  calculated_expression: string
  calculation_type: 'string' | 'integer' | 'float'
}

export function isCalculatedField(field: CustomField): field is CalculatedField {
  return field.type === FieldType.CALCULATED
}

export interface FileField extends BaseCustomField {
  type: FieldType.FILE
  private_storage: boolean
}

export function isFileField(field: CustomField): field is FileField {
  return field.type === FieldType.FILE
}

export type CustomField = RegularField | RelationalField | SelectField | GeoField | CalculatedField | FileField

export function isFieldOf(
  type:
    | FieldType.STRING
    | FieldType.TEXT
    | FieldType.EMAIL
    | FieldType.INTEGER
    | FieldType.FLOAT
    | FieldType.BOOLEAN
    | FieldType.DATE
    | FieldType.TIME
    | FieldType.DATE_TIME
    | FieldType.CUSTOMER
    | FieldType.GALLERY
    | FieldType.JSON,
): (field: CustomField) => field is RegularField

export function isFieldOf(
  type: FieldType.BELONGS_TO | FieldType.BELONGS_TO_MANY,
): (field: CustomField) => field is RelationalField

export function isFieldOf(type: FieldType.FILE): (field: CustomField) => field is FileField
export function isFieldOf(type: FieldType.CALCULATED): (field: CustomField) => field is CalculatedField
export function isFieldOf(type: FieldType.GEO): (field: CustomField) => field is GeoField
export function isFieldOf(type: FieldType.SELECT | FieldType.MULTI_SELECT): (field: CustomField) => field is SelectField

export function isFieldOf(type: FieldType) {
  return function (field: CustomField): field is CustomField {
    return field.type === type
  }
}

export interface Channel extends BaseNimbuObject {
  acl: ChannelACL
  customizations: CustomField[]
  description: string | null
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
  _acl: ChannelEntryACL
  slug: string
  url: string
  short_id: string
  _owner?: string
  [k: string]: any
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
  size: number
  url: string
  version: string
  width: number
  private: false
}

type BaseChannelEntryPrivateFile = BaseChannelEntryFile & {
  permanent_backend_url: string
  permanent_relative_url: string
  permanent_url: string
  private: true
}

export type ChannelEntryFile = BaseChannelEntryFile | BaseChannelEntryPrivateFile

export interface Customer extends BaseNimbuObject {
  name: string
  firstname: string
  lastname: string
  email: string
  language: string
  number: number
  slug: string
  status: string
  groups: string[]
  [k: string]: any
}
