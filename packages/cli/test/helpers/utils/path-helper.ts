const isBinaryFile = require('isbinaryfile')
import * as _ from 'lodash'
import * as fs from 'node:fs'
// from https://github.com/ronp001/ts-utils/blob/master/src/path_helper.ts
import * as path from 'node:path'

export function notnull<T>(arg: null | T | undefined, name?: string): T {
  if (arg == null) {
    const exp = name ? ` for ${name}` : ''
    throw new Error(`unexpected value${exp}: ${arg}`)
  }

  return arg
}

/**
 * An immutable path object with utility methods to navigate the filesystem, get information and perform
 * operations on the path (read,write,etc.)
 */
export class AbsPath {
  //------------------------------------------------------------
  // Factory Methods
  //------------------------------------------------------------

  /**
   * create an absolute path from a string
   *
   * @param pathseg - if an absolute path, ignores basedir
   *                  if relative path, uses basedir as reference point
   * @param basedir - if null: uses process.cwd() as basedir
   */
  public static fromStringAllowingRelative(pathseg: null | string = null, basedir: null | string = null): AbsPath {
    if (basedir === null) {
      basedir = process.cwd()
    }

    if (pathseg) {
      if (path.isAbsolute(pathseg)) {
        return new AbsPath(pathseg)
      }

      return new AbsPath(path.join(basedir, pathseg))
    }

    return new AbsPath(basedir)
  }

  /**
   * @param filepath starting point
   *
   * @returns array with an AbsPath object for each containing directory
   */
  public static dirHierarchy(filepath: string): Array<AbsPath> {
    return new AbsPath(filepath).dirHierarchy
  }

  //------------------------------------------------------------
  // Path Functions
  //------------------------------------------------------------

  public readonly _abspath: null | string

  public get abspath(): string {
    if (this._abspath === null) {
      throw new Error('abspath is not set')
    }

    return this._abspath
  }

  /**
   *
   * @param from a string or AbsPath specifying an absolute path, or null
   */
  constructor(from: AbsPath | null | string | undefined) {
    if (from === undefined || from === null) {
      this._abspath = null
    } else if (from instanceof AbsPath) {
      this._abspath = from._abspath
    } else if (path.isAbsolute(from)) {
      this._abspath = path.normalize(from)
    } else {
      this._abspath = path.normalize(path.join(process.cwd(), from))
    }
  }

  /**
   * @returns normalized absolute path.  returns "" if no path set
   */
  public toString(): string {
    if (this._abspath === null) return ''
    return this._abspath
  }

  /**
   * @returns the basename of the path
   */
  public get basename(): string {
    if (this._abspath === null) return ''
    return path.basename(this._abspath)
  }

  /**
   * @param other - the reference path to calculate the relative path from
   * @param must_be_contained_in_other - if true, returns null unless this path is contained in the other path
   *
   * @returns the relative path to get to this path from other
   */
  public relativeFrom(other: AbsPath, must_be_contained_in_other: boolean = false): null | string {
    if (this._abspath === null) return null
    if (other._abspath === null) return null

    if (must_be_contained_in_other && !this._abspath.startsWith(other._abspath)) return null
    let result = path.relative(other._abspath, this._abspath)
    if (result === '' && this.isDir) {
      result = '.'
    }

    return result
  }

  /**
   *
   * @param other
   * @param must_be_contained_in_other
   *
   * @returns the relative path to get to the other path from this path
   */
  // public relativeTo(other: AbsPath, must_be_contained_in_other: boolean = false): string | null {
  //     return other.relativeFrom(this)
  // }

  /**
   * @returns true if path is set, false if it is null
   */
  public get isSet(): boolean {
    return this._abspath !== null
  }

  /**
   *
   * @param filepath path segment to add
   *
   * @returns filepath with the additional segment
   */
  public add(filepath: string): AbsPath {
    if (this._abspath === null) return this
    return new AbsPath(path.join(this._abspath, filepath.toString()))
  }

  /**
   * @returns AbsPath of the parent dir. If path is root, returns AbsPath of root.
   */
  public get parent(): AbsPath {
    if (this._abspath === null) return this
    const parent_dir = path.dirname(this._abspath)
    return new AbsPath(parent_dir)
  }

  /**
   * @param n how many levels up the hierarchy
   * @returns AbsPath of the directory which is <n> levels up.  (.parents(1) is the same is .parent)
   */
  public parents(n: number): AbsPath {
    if (n === 0) return this

    return this.parent.parents(n - 1)
  }

  //------------------------------------------------------------
  // Recognition
  //------------------------------------------------------------

  /**
   * @returns true if root directory of the filesystem, false otherwise
   */
  public get isRoot(): boolean {
    if (this._abspath === null) return false
    return this._abspath === path.parse(this._abspath).root
  }

  /**
   * @returns true if path is found in the filesystem, false otherwise
   */
  public get exists(): boolean {
    if (this._abspath === null) return false
    try {
      fs.lstatSync(this._abspath)
      return true
    } catch {
      return false
    }
  }

  /**
   * @returns true if a normal file, false otherwise
   */
  public get isFile(): boolean {
    if (this._abspath === null) return false
    try {
      return fs.lstatSync(this._abspath).isFile()
    } catch {
      return false
    }
  }

  /**
   * @returns true if a directory, false otherwise
   */
  public get isDir(): boolean {
    if (this._abspath === null) return false
    try {
      return fs.lstatSync(this._abspath).isDirectory()
    } catch {
      return false
    }
  }

  /**
   * @returns true if a directory, false otherwise
   */
  public get isEmptyDir(): boolean {
    if (this._abspath === null) return false
    if (!this.isDir) return false
    try {
      const files = fs.readdirSync(this._abspath)
      return files.length === 0
    } catch {
      return false
    }
  }

  /**
   * @returns true if a symbolic link, false otherwise
   */
  public get isSymLink(): boolean {
    if (this._abspath === null) return false
    try {
      return fs.lstatSync(this._abspath).isSymbolicLink()
    } catch {
      return false
    }
  }

  /**
   * see https://www.npmjs.com/package/isbinaryfile
   *
   * @returns true if the file is binary, false otherwise
   */
  public get isBinaryFile(): boolean {
    if (this._abspath === null) return false
    if (!this.isFile) return false

    return isBinaryFile.sync(this._abspath)
  }

  /**
   * throws an exception if path validation fails.
   * @param t what to check for
   * @returns itself
   */
  public validate(t: 'exists' | 'is_binary' | 'is_dir' | 'is_file' | 'is_symlink'): AbsPath {
    if (!this.exists) {
      const error =
        t === 'is_dir' ? new Error(`${this._abspath}/ does not exist`) : new Error(`${this._abspath} does not exist`)
      throw error
    }

    switch (t) {
      case 'exists': {
        break
      }

      case 'is_binary': {
        if (!this.isBinaryFile) throw new Error(`${this._abspath} is not a binary file`)
        break
      }

      case 'is_dir': {
        if (!this.isDir) throw new Error(`${this._abspath}/ is not a directory`)
        break
      }

      case 'is_file': {
        if (!this.isFile) throw new Error(`${this._abspath} is not a file`)
        break
      }

      case 'is_symlink': {
        if (!this.isSymLink) throw new Error(`${this._abspath} is not a symlink`)
        break
      }

      default: {
        throw new Error(`unhandled validation: ${t}`)
      }
    }

    return this
  }

  //------------------------------------------------------------
  // Directory Contents
  //------------------------------------------------------------

  /**
   * @returns true if contains a file of the given name, false otherwise
   */
  public containsFile(filename: string) {
    if (this._abspath === null) return false
    return this.add(filename).isFile
  }

  /**
   * @returns true if contains a directory of the given name, false otherwise
   */
  public containsDir(filename: string) {
    if (this._abspath === null) return false
    return this.add(filename).isDir
  }

  /**
   * scans upwards from the current path, looking for a file or directory with a given name
   * @param filename the fs entry to search for
   * @param can_be_dir if false, will only look for regular files.  if true, will look for directories as well.
   * @returns true if found, false if not
   */
  public findUpwards(filename: string, can_be_dir: boolean = false): AbsPath {
    for (const dir of this.dirHierarchy) {
      if (dir.containsFile(filename)) {
        return dir.add(filename)
      }

      if (can_be_dir && dir.containsDir(filename)) {
        return dir.add(filename)
      }
    }

    return new AbsPath(null)
  }

  /**
   * @returns an array of AbsPath objects, each one pointing to a containing directory
   */
  public get dirHierarchy(): Array<AbsPath> {
    const buildHierarchy = (current: AbsPath, depth: number): Array<AbsPath> => {
      if (depth <= 0 || current.isRoot) {
        return [current, current.parent]
      }

      const {parent} = current
      if (current._abspath === parent._abspath) {
        return [current, parent]
      }

      return [current, ...buildHierarchy(parent, depth - 1)]
    }

    return buildHierarchy(this, 30)
  }

  //------------------------------------------------------------
  // Symbolic Link Processing
  //------------------------------------------------------------

  /**
   * @returns an AbsPath pointing to the target of the symbolic link
   */
  public get symLinkTarget(): AbsPath {
    if (this._abspath === null) return this
    if (!this.isSymLink) return this
    return new AbsPath(fs.readlinkSync(this._abspath).toString())
  }

  /**
   * @returns an AbsPath with symbolic links completely resolved
   */
  public get realpath(): AbsPath {
    if (this._abspath === null) return this

    return new AbsPath(fs.realpathSync(this._abspath))
  }

  //------------------------------------------------------------
  // File Contents
  //------------------------------------------------------------

  /**
   * @returns file contents as an array of strings
   */
  public get contentsLines(): Array<string> {
    return this.contentsString.split('\n')
  }

  /**
   * @returns file contents as an array of strings
   */
  public get contentsString(): string {
    if (this._abspath === null || !this.isFile) return ''
    return fs.readFileSync(this._abspath, 'utf8')
  }

  /**
   * @returns file contents as a buffer object
   */
  public get contentsBuffer(): Buffer {
    if (this._abspath === null || !this.isFile) return Buffer.alloc(0)

    return fs.readFileSync(this._abspath)
  }

  /**
   * @returns parsed contents of a JSON file or null if not a JSON file
   */
  // tslint:disable-next-line: ban-types
  public get contentsFromJSON(): null | object {
    if (this._abspath === null || !this.isFile) return null
    const buf = this.contentsBuffer
    try {
      return JSON.parse(buf.toString())
    } catch {
      return null
    }
  }

  /**
   * store new contents in the file
   *
   * @param contents a string with the new contents
   */
  public saveStrSync(contents: string) {
    if (this._abspath === null) {
      throw new Error("can't save - abspath is null")
    }

    try {
      this.parent.mkdirs()
    } catch (error) {
      if (error instanceof Error) {
        throw new TypeError(`can't save ${this.toString()} - ${error.message}`)
      }
    }

    fs.writeFileSync(this._abspath, contents)
  }

  //------------------------------------------------------------
  // Directory contents and traversal
  //------------------------------------------------------------

  /**
   * @returns an array of AbsPath objects corresponding to each entry in the directory
   * or null if not a directory
   */
  public get dirContents(): Array<AbsPath> | null {
    if (this._abspath === null) return null
    if (!this.isDir) return null

    const result: Array<AbsPath> = []

    for (const entry of fs.readdirSync(this._abspath)) {
      result.push(this.add(entry))
    }

    return result
  }

  /**
   * Traverse the directory hierarchy and activate a callback for each entry.
   *
   * The hierarchy is traversed twice: first down, then up, allowing the callback
   * function to accumulate data on the way down and perform operations on the way up.
   *
   * Aborts the traversal if the callback function returns true
   *
   * @param fn callback to activate
   */
  public foreachEntryInDir(fn: (entry: AbsPath, traversal_direction: 'down' | 'up' | null) => boolean | void): boolean {
    const entries = this.dirContents
    if (entries === null) return true

    for (const entry of entries) {
      if (entry.isDir) {
        let abort
        abort = fn(entry, 'down')
        if (abort) return true
        abort = entry.foreachEntryInDir(fn)
        if (abort) return true
        abort = fn(entry, 'up')
        if (abort) return true
      } else {
        const abort = fn(entry, null)
        if (abort) return true
      }
    }

    return false
  }

  //------------------------------------------------------------
  // Modifying the filesystem
  //------------------------------------------------------------

  public renameTo(new_name: string) {
    if (this._abspath === null) return
    if (!this.exists) return

    fs.renameSync(this._abspath, new_name)
  }

  public unlinkFile() {
    this.rmFile()
  }

  public rmFile() {
    if (this._abspath === null) {
      throw new Error('rmFile - path is not set')
    }

    if (!this.isFile) {
      throw new Error(`rmFile - ${this} is not a file`)
    }

    fs.unlinkSync(this._abspath)
  }

  //------------------------------------------------------------
  // Directory creation and removal
  //------------------------------------------------------------

  public mkdirs() {
    if (this._abspath === null) throw new Error("can't mkdirs for null abspath")
    if (this.exists) return
    if (this.isRoot) return

    const { parent } = this
    if (parent.exists && !parent.isDir && !parent.isSymLink) {
      throw new Error(`${parent.toString()} exists and is not a directory or symlink`)
    } else {
      parent.mkdirs()
    }

    fs.mkdirSync(this.parent.realpath.add(this.basename).toString())
  }

  public rmrfdir(must_match: RegExp, remove_self = false) {
    if (this._abspath === null) return
    if (!this.isDir) return
    if (remove_self && !must_match.test(this._abspath)) {
      throw new Error(`${this._abspath} does not match ${must_match} - aborting delete operation`)
    }

    this.foreachEntryInDir((p: AbsPath, direction: 'down' | 'up' | null) => {
      if (p._abspath === null) return
      if (!must_match.test(p._abspath)) {
        throw new Error(`${p._abspath} does not match ${must_match} - aborting delete operation`)
      }

      if (direction === 'up' || direction === null) {
        if (p.isDir) {
          fs.rmdirSync(p._abspath)
        } else {
          fs.unlinkSync(p._abspath)
        }
      }
    })
    if (remove_self) {
      fs.rmdirSync(this._abspath)
    }
  }

  //------------------------------------------------------------
  // File version naming
  //
  // (assumes a numeric suffix describing the version
  //  e.g:  "myfile.txt.3" is version 3 of "myfile.txt")
  //
  // Useful for keeping a backup of a file before modifying it.
  //------------------------------------------------------------

  public get maxVer(): null | number {
    const existing_versions = this.existingVersions
    if (existing_versions === null) return null

    const max: number | undefined = _.max(existing_versions)

    if (max === undefined) return null
    return max
  }

  /**
   * renames <path> to <path>.<n+1>, where <n> is the largest integer for which <path>.<n> exists
   * if no file matching the form <path>.<n> is found, renames to <path>.1
   *
   * for example, if the current path is "/my/file", it will be renamed to:
   *   /my/file.2   - if /my/file.1 exists
   *   /my/file.3   - if /my/file.2 exists
   *   /my/file.1   - if no such file exists
   *   etc.
   */
  public renameToNextVer(): AbsPath {
    const current_max_ver: null | number = this.maxVer

    const newname: string =
      current_max_ver === null ? this._abspath + '.1' : this._abspath + `.${current_max_ver + 1}`
    this.renameTo(newname)
    return new AbsPath(newname)
  }

  public get existingVersions(): null | number[] {
    if (this._abspath === null) return null
    if (!this.exists) return null

    const regex = new RegExp(`${this._abspath}\\.([0-9]+)`)
    const existing = this.parent.dirContents
    const matching: Array<null | number> = _.map(existing, (el: AbsPath) => {
      const matches = el.toString().match(regex)
      if (matches === null) return null
      return Number.parseInt(matches[1], 10)
    })

    const nums: number[] = _.filter(matching, (e) => e !== null) as number[]

    return _.sortBy(nums)
  }
}
