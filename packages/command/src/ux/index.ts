import { Flags as CoreFlags } from '@oclif/core'
import {
  colorize,
  colorizeJson,
  action as coreAction,
  stderr as coreStderr,
  stdout as coreStdout,
  error,
  exit,
  warn,
} from '@oclif/core/ux'
import inquirer from 'inquirer'
import { dump as toYaml } from 'js-yaml'
import { inspect } from 'node:util'
import treeify from 'object-treeify'
import TtyTable from 'tty-table'

type PromptType = 'hide' | 'mask' | 'normal'

export interface PromptOptions {
  default?: string
  required?: boolean
  /** @deprecated cli-ux supported timeout, but the new prompt implementation ignores it */
  timeout?: number
  type?: PromptType
}

type ColumnValueGetter<T> = (row: T) => unknown

export interface TableColumn<T extends Record<string, unknown>> {
  extended?: boolean
  get?: ColumnValueGetter<T>
  header?: string
  minWidth?: number
}

export type TableColumns<T extends Record<string, unknown>> = Record<string, TableColumn<T>>

export interface TableOptions {
  columns?: string
  csv?: boolean
  extended?: boolean
  filter?: string
  'no-header'?: boolean
  'no-truncate'?: boolean
  output?: 'csv' | 'json' | 'yaml'
  printLine?(value: string): void
  sort?: string
  title?: string
}

interface NormalizedColumn<T extends Record<string, unknown>> {
  extended: boolean
  get: ColumnValueGetter<T>
  header: string
  key: string
}

const capitalizeWords = (value: string): string =>
  value.replaceAll(/[_-]+/g, ' ').replaceAll(/\w\S*/g, (match) => match.charAt(0).toUpperCase() + match.slice(1))

const toPrintable = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return inspect(value, { breakLength: Number.POSITIVE_INFINITY, depth: Number.POSITIVE_INFINITY })
}

const createPromptQuestion = (name: string, options: PromptOptions) => {
  const required = options.required ?? true
  const baseValidate = (input: string) => {
    if (!required || (input != null && String(input).trim() !== '')) return true
    return 'Please provide a value'
  }

  const type = options.type ?? 'normal'
  if (type === 'normal') {
    return {
      default: options.default,
      message: name,
      name: 'value',
      type: 'input' as const,
      validate: baseValidate,
    }
  }

  const question = {
    default: options.default,
    message: name,
    name: 'value',
    type: 'password' as const,
    validate: baseValidate,
  }

  if (type === 'mask') {
    return { ...question, mask: '*' }
  }

  // hide
  return { ...question, mask: false }
}

async function prompt(name: string, options: PromptOptions = {}): Promise<string> {
  return coreAction.pauseAsync(async () => {
    const question = createPromptQuestion(name, options)
    const { value } = await inquirer.prompt<{ value: string }>([question])
    return value
  })
}

async function confirm(message: string): Promise<boolean> {
  return coreAction.pauseAsync(async () => {
    const { value } = await inquirer.prompt<{ value: boolean }>([
      {
        message,
        name: 'value',
        type: 'confirm',
      },
    ])

    return value
  })
}

const selectColumnByHeader = <T extends Record<string, unknown>>(columns: NormalizedColumn<T>[], header: string) => {
  const matcher = header.toLowerCase()
  return (
    columns.find((column) => column.header.toLowerCase() === matcher) ??
    columns.find((column) => column.key.toLowerCase() === matcher)
  )
}

function applyFilter<T extends Record<string, unknown>>(
  rows: Record<string, string>[],
  columns: NormalizedColumn<T>[],
  filter?: string,
): Record<string, string>[] {
  if (!filter) return rows
  let [header, pattern] = filter.split('=')
  if (!pattern) {
    throw new Error('Filter flag has an invalid value')
  }

  const negate = header.startsWith('-')
  if (negate) header = header.slice(1)
  const column = selectColumnByHeader(columns, header)
  if (!column) {
    throw new Error(`Unknown column "${header}"`)
  }

  const regex = new RegExp(pattern)
  return rows.filter((row) => {
    const value = row[column.key] ?? ''
    const match = regex.test(value)
    return negate ? !match : match
  })
}

function applySort<T extends Record<string, unknown>>(
  rows: Record<string, string>[],
  columns: NormalizedColumn<T>[],
  sort?: string,
) {
  if (!sort) return rows
  const collator = new Intl.Collator()
  const sorters = sort.split(',').map((token) => {
    const direction = token.startsWith('-') ? -1 : 1
    const header = direction === -1 ? token.slice(1) : token
    const column = selectColumnByHeader(columns, header)
    if (!column) {
      throw new Error(`Unknown column "${header}"`)
    }

    return { column, direction }
  })

  return [...rows].sort((a, b) => {
    for (const sorter of sorters) {
      const left = a[sorter.column.key] ?? ''
      const right = b[sorter.column.key] ?? ''
      const result = collator.compare(left, right)
      if (result !== 0) return result * sorter.direction
    }

    return 0
  })
}

function selectColumns<T extends Record<string, unknown>>(
  columns: NormalizedColumn<T>[],
  options: TableOptions,
): NormalizedColumn<T>[] {
  if (options.columns) {
    const requested = options.columns
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (requested.length === 0) {
      throw new Error('Columns flag requires at least one column name')
    }

    return requested.map((header) => {
      const column = selectColumnByHeader(columns, header)
      if (!column) throw new Error(`Unknown column "${header}"`)
      return column
    })
  }

  if (options.extended) return columns
  return columns.filter((column) => !column.extended)
}

const toCsvValue = (value: string): string => {
  if (value === '') return ''
  const needsQuotes = /[\n",]/.test(value)
  if (!needsQuotes) return value
  return `"${value.replaceAll('"', '""')}"`
}

function printCsv<T extends Record<string, unknown>>(
  rows: Record<string, string>[],
  columns: NormalizedColumn<T>[],
  options: TableOptions,
): void {
  const printLine = options.printLine ?? ((line: string) => coreStdout(line))
  if (!options['no-header']) {
    printLine(columns.map((column) => toCsvValue(column.header)).join(','))
  }

  for (const row of rows) {
    const line = columns.map((column) => toCsvValue(row[column.key] ?? '')).join(',')
    printLine(line)
  }
}

function printStructuredOutput<T extends Record<string, unknown>>(
  rows: Record<string, string>[],
  columns: NormalizedColumn<T>[],
  as: 'json' | 'yaml',
  options: TableOptions,
): void {
  const printLine = options.printLine ?? ((line: string) => coreStdout(line))
  const structured = rows.map((row) => {
    const entry: Record<string, string> = {}
    for (const column of columns) {
      entry[column.header] = row[column.key] ?? ''
    }

    return entry
  })

  if (as === 'json') {
    printLine(JSON.stringify(structured, null, 2))
    return
  }

  printLine(toYaml(structured).trimEnd())
}

function printTable<T extends Record<string, unknown>>(
  rows: Record<string, string>[],
  columns: NormalizedColumn<T>[],
  options: TableOptions,
): void {
  const header = columns.map((column) => ({
    alias: column.header,
    align: 'left' as const,
    headerAlign: 'left' as const,
    headerColor: 'cyan',
    value: column.key,
  }))

  const body = rows.map((row) => columns.map((column) => row[column.key] ?? ''))
  const table = new TtyTable(header, body, {
    align: 'left',
    borderStyle: 'solid',
    compact: true,
    headerAlign: 'left',
    marginLeft: 0,
    marginTop: 0,
    paddingBottom: 0,
    paddingLeft: 1,
    paddingRight: 1,
    paddingTop: 0,
    showHeader: options['no-header'] === true ? false : null,
    truncate: options['no-truncate'] ? false : '…',
    width: '100%',
  })

  const rendered = table.render()
  const printLine = options.printLine ?? ((line: string) => coreStdout(line))
  const lines = rendered.split(/\r?\n/)
  if (options.title) {
    printLine(options.title)
  }

  for (const line of lines) {
    if (line === '' && options['no-header'] && lines.length === 1) continue
    printLine(line)
  }
}

function table<T extends Record<string, unknown>>(
  data: T[],
  rawColumns: TableColumns<T>,
  options: TableOptions = {},
): void {
  const normalizedColumns: NormalizedColumn<T>[] = Object.entries(rawColumns).map(([key, column]) => ({
    extended: column.extended ?? false,
    get: column.get ?? ((row: T) => (row as Record<string, unknown>)[key]),
    header: column.header ?? capitalizeWords(key),
    key,
  }))

  const rows = data.map((row) => {
    const result: Record<string, string> = {}
    for (const column of normalizedColumns) {
      result[column.key] = toPrintable(column.get(row))
    }

    return result
  })

  const processedRows = applySort(applyFilter(rows, normalizedColumns, options.filter), normalizedColumns, options.sort)
  const activeColumns = selectColumns(normalizedColumns, options)
  const output = options.csv ? 'csv' : options.output

  switch (output) {
    case 'csv': {
      printCsv(processedRows, activeColumns, options)
      break
    }

    case 'json': {
      printStructuredOutput(processedRows, activeColumns, 'json', options)
      break
    }

    case 'yaml': {
      printStructuredOutput(processedRows, activeColumns, 'yaml', options)
      break
    }

    default: {
      printTable(processedRows, activeColumns, options)
    }
  }
}

const tableFlagDefinitions = {
  columns: CoreFlags.string({ description: 'only show provided columns (comma-separated)', exclusive: ['extended'] }),
  csv: CoreFlags.boolean({ description: 'output is csv format [alias: --output=csv]', exclusive: ['no-truncate'] }),
  extended: CoreFlags.boolean({ char: 'x', description: 'show extra columns', exclusive: ['columns'] }),
  filter: CoreFlags.string({ description: 'filter property by partial string matching, ex: name=foo' }),
  'no-header': CoreFlags.boolean({ description: 'hide table header from output', exclusive: ['csv'] }),
  'no-truncate': CoreFlags.boolean({ description: 'do not truncate output to fit screen', exclusive: ['csv'] }),
  output: CoreFlags.string({
    description: 'output in a more machine friendly format',
    exclusive: ['no-truncate', 'csv'],
    options: ['csv', 'json', 'yaml'],
  }),
  sort: CoreFlags.string({ description: "property to sort by (prepend '-' for descending)" }),
} as const

type TableFlagDefinitions = typeof tableFlagDefinitions
type TableFlagKey = keyof TableFlagDefinitions

type TableFlagOptions = {
  except?: TableFlagKey | TableFlagKey[]
  only?: TableFlagKey | TableFlagKey[]
}

type TableFlagOverload = {
  (): TableFlagDefinitions
  <K extends TableFlagKey>(opts: { except: K | K[] }): Omit<TableFlagDefinitions, K>
  <K extends TableFlagKey>(opts: { only: K | K[] }): Pick<TableFlagDefinitions, K>
}

const normalizeKeys = (value?: TableFlagKey | TableFlagKey[]): TableFlagKey[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const computeTableFlags = ((opts?: TableFlagOptions) => {
  const allKeys = Object.keys(tableFlagDefinitions) as TableFlagKey[]
  const onlyKeys = normalizeKeys(opts?.only)
  const exceptKeys = new Set(normalizeKeys(opts?.except))
  const keysToInclude = onlyKeys.length > 0 ? onlyKeys : allKeys
  const result: Partial<Record<TableFlagKey, TableFlagDefinitions[TableFlagKey]>> = {}

  for (const key of keysToInclude) {
    if (exceptKeys.has(key)) continue
    result[key] = tableFlagDefinitions[key]
  }

  return result as any
}) as TableFlagOverload

type TableWithFlags = typeof table & { flags: TableFlagOverload }

const tableWithFlags = table as TableWithFlags
tableWithFlags.flags = computeTableFlags

class Tree {
  nodes: Record<string, Tree> = {}

  insert(child: string, value: Tree = new Tree()): Tree {
    this.nodes[child] = value
    return this.nodes[child]
  }

  search(key: string): Tree | undefined {
    if (this.nodes[key]) return this.nodes[key]
    for (const child of Object.values(this.nodes)) {
      const found = child.search(key)
      if (found) return found
    }

    return undefined
  }

  display(logger: (value: string) => void = console.log): void {
    const assemble = (nodes: Record<string, Tree>): Record<string, unknown> => {
      const tree: Record<string, unknown> = {}
      for (const [name, child] of Object.entries(nodes)) {
        tree[name] = assemble(child.nodes)
      }

      return tree
    }

    logger(treeify(assemble(this.nodes)))
  }
}

function tree(): Tree {
  return new Tree()
}

type StdoutLogger = (...args: Parameters<typeof coreStdout>) => void

type NimbuUx = {
  action: typeof coreAction
  colorize: typeof colorize
  colorizeJson: typeof colorizeJson
  confirm: typeof confirm
  error: typeof error
  exit: typeof exit
  info: StdoutLogger
  log: StdoutLogger
  prompt: typeof prompt
  stderr: typeof coreStderr
  stdout: typeof coreStdout
  table: TableWithFlags
  tree: typeof tree
  warn: typeof warn
}

export const ux: NimbuUx = {
  action: coreAction,
  colorize,
  colorizeJson,
  confirm,
  error,
  exit,
  info(...args: Parameters<typeof coreStdout>) {
    coreStdout(...args)
  },
  log(...args: Parameters<typeof coreStdout>) {
    coreStdout(...args)
  },
  prompt,
  stderr: coreStderr,
  stdout: coreStdout,
  table: tableWithFlags,
  tree,
  warn,
}

export default ux
