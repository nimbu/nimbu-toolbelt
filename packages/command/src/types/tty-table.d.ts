declare module 'tty-table' {
  type Alignment = 'center' | 'left' | 'right'

  interface ColumnConfig {
    [key: string]: unknown
    alias?: string
    align?: Alignment
    headerAlign?: Alignment
    headerColor?: string
    value?: string
    width?: number | string
  }

  interface TableOptions {
    [key: string]: unknown
    align?: Alignment
    borderColor?: null | string
    borderStyle?: 'dashed' | 'invisible' | 'none' | 'solid' | string
    compact?: boolean
    headerAlign?: Alignment
    marginLeft?: number
    marginTop?: number
    paddingBottom?: number
    paddingLeft?: number
    paddingRight?: number
    paddingTop?: number
    showHeader?: boolean | null
    truncate?: boolean | string
    width?: number | string
  }

  interface TableInstance {
    render(): string
  }

  interface TableFactory {
    new (header?: ColumnConfig[], rows?: Array<Array<string>>, options?: TableOptions): TableInstance
    (header?: ColumnConfig[], rows?: Array<Array<string>>, options?: TableOptions): TableInstance
  }

  const Table: TableFactory
  export default Table
}
