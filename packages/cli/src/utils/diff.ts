import { ux } from '@oclif/core'
import chalk from 'chalk'

export function convertChangesToTree(fields, tree?) {
  if (tree == null) {
    tree = ux.tree()
  }

  for (const key of Object.keys(fields)) {
    tree.insert(key)
  }

  for (const key of Object.keys(fields)) {
    const changes = fields[key]

    if (typeof changes === 'object' && changes.constructor === Object) {
      for (const changedField of Object.keys(changes)) {
        const value = changes[changedField]
        if (Array.isArray(value)) {
          const label = `${chalk.bold(changedField)}`
          tree.nodes[key].insert(label)
          for (const option of value) {
            tree.nodes[key].nodes[label].insert(option)
          }
        } else if (value && typeof value === 'object' && value.constructor === Object) {
          convertChangesToTree(value, tree.nodes[key])
        } else {
          tree.nodes[key].insert(`${chalk.bold(changedField)}: ${value}`)
        }
      }
    }
  }

  return tree
}

export function addFieldNames(diff, from, to) {
  if (Object.keys(diff.added ?? {}).length === 0) {
    delete diff.added
  } else if (diff.added != null) {
    for (const index of Object.keys(diff.added)) {
      diff.added[to[index].name] = diff.added[index]
      delete diff.added[index]
    }
  }

  if (Object.keys(diff.deleted ?? {}).length === 0) {
    delete diff.deleted
  } else if (diff.deleted != null) {
    for (const index of Object.keys(diff.deleted)) {
      diff.deleted[from[index].name] = diff.deleted[index]
      delete diff.deleted[index]
    }
  }

  if (Object.keys(diff.updated ?? {}).length === 0) {
    delete diff.updated
  } else if (diff.updated != null) {
    for (const index of Object.keys(diff.updated)) {
      diff.updated[to[index].name] = diff.updated[index]
      delete diff.updated[index]
    }
  }
}

export function cleanUpIds(data) {
  delete data.id
  delete data.created_at
  delete data.updated_at
}
