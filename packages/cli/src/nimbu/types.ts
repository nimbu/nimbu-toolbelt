type ACLScope = 'public' | 'shared' | 'private' | 'none'
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

export type ChannelACL = {
  create: ACLScope
  read: ACLScope
  update: ACLScope
  delete: ACLScope
}

export type SelectOption = {
  id: string
  position: number
  name: string
  slug: string
}

interface BaseCustomField {
  created_at: Date
  hint: string | null
  id: string
  label: string
  localized: boolean
  unique: boolean
  encrypted: boolean
  name: string
  required: boolean
  required_expression?: string
  updated_at: Date
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

export interface RelationalField extends BaseCustomField {
  type: FieldType.BELONGS_TO | FieldType.BELONGS_TO_MANY
  reference: string
}

export interface SelectField extends BaseCustomField {
  type: FieldType.SELECT | FieldType.MULTI_SELECT
  select_options: SelectOption[]
}

export interface GeoField extends BaseCustomField {
  type: FieldType.GEO
  geo_type: GeoType
}

export interface CalculatedField extends BaseCustomField {
  type: FieldType.CALCULATED
  calculated_expression: string
  calculation_type: 'string' | 'integer' | 'float'
}

export interface FileField extends BaseCustomField {
  type: FieldType.FILE
  private_storage: boolean
}

export type CustomField = RegularField | RelationalField | SelectField | GeoField | CalculatedField | FileField

export type Channel = {
  acl: ChannelACL
  created_at: Date
  customizations: CustomField[]
  description: string | null
  entries_url: string
  id: string
  label_field: string
  name: string
  order_by: string
  order_direction: 'asc' | 'desc'
  rss_enabled: boolean
  slug: string
  submittable: boolean
  title_field: string
  updated_at: Date
  url: string
}
