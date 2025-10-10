// from https://github.com/ronp001/ts-utils/blob/master/src/mock_fs_helper.ts
import * as _ from 'lodash'

import { AbsPath } from './path-helper'

export class MockFSHelper {
  public static ls(
    dir: AbsPath | string,
    max_levels: number = 5,
    with_contents_of: Array<string> | null = null,
  ): { [key: string]: any } {
    const result: { [key: string]: any } = {}
    if (typeof dir === 'string') dir = new AbsPath(dir)

    for (const entry of dir.dirContents || []) {
      // console.log(entry.abspath)
      if (entry.isFile) {
        result[entry.basename] =
          with_contents_of && (with_contents_of[0] === '*' || _.includes(with_contents_of, entry._abspath))
            ? entry.contentsBuffer.toString()
            : '<file>'
      } else if (entry.isDir) {
        result[entry.basename] = max_levels > 0 ? this.ls(entry, max_levels - 1, with_contents_of) : '<dir>'
      }
    }

    return result
  }

  public constructor(public fs_structure: { [key: string]: any } = {}) {}

  public addSourceDirContents(): MockFSHelper {
    this.addDirContents(this.src_dir)
    return this
  }

  public addFile(file: AbsPath | string): MockFSHelper {
    if (typeof file === 'string') {
      file = new AbsPath(file)
    }

    if (file._abspath === null) {
      throw new Error('file path is null')
    }

    this.fs_structure[file._abspath] = file.contentsBuffer.toString()
    return this
  }

  public addDirContents(dir: AbsPath, max_levels: number = 5): MockFSHelper {
    for (const entry of dir.dirContents || []) {
      if (entry.isFile) {
        if (entry._abspath === null) {
          throw new Error('entry path is null')
        }

        this.fs_structure[entry._abspath] = entry.contentsBuffer.toString()
      } else if (entry.isDir && max_levels > 0) {
        this.addDirContents(entry, max_levels - 1)
      }
    }

    return this
  }

  public get src_dir(): AbsPath {
    return new AbsPath(__dirname).findUpwards('src', true)
  }

  public addDirs(dirs: Array<AbsPath | string>): MockFSHelper {
    for (const dir of dirs) {
      this.addDirContents(new AbsPath(dir))
    }

    return this
  }
}
