import { beforeEach, describe, expect, test } from 'vitest'
import { createCwaResourceError, CwaResourceError } from '../../../errors/cwa-resource-error'
import actions, { CwaResourcesActionsInterface } from './actions'
import state, { CwaResourceApiStatuses, CwaResourcesStateInterface } from './state'

describe('We can reset current resources', () => {
  const resourcesState = state()
  const resourcesActions = actions(resourcesState)

  test('We can reset current resources', () => {
    resourcesState.new.byId = {
      id: {}
    }
    resourcesState.new.allIds = ['id']
    resourcesState.current.currentIds = ['current']
    resourcesActions.resetCurrentResources()
    expect(resourcesState.new.byId).toStrictEqual({})
    expect(resourcesState.new.allIds).toStrictEqual([])
    expect(resourcesState.current.currentIds).toStrictEqual([])
  })

  test('We can reset current resources with new current IDs state', () => {
    resourcesState.new.byId = {
      id: {}
    }
    resourcesState.current.byId = {
      id: {
        apiState: {
          status: undefined
        }
      },
      current: {
        apiState: {
          status: undefined
        }
      }
    }
    resourcesState.new.allIds = ['id', 'current']
    resourcesState.current.currentIds = ['current']
    resourcesActions.resetCurrentResources(['id'])
    expect(resourcesState.new.byId).toStrictEqual({})
    expect(resourcesState.new.allIds).toStrictEqual([])
    expect(resourcesState.current.currentIds).toStrictEqual(['id'])
  })

  test('If we try and reset current ids with a resource id that does not exist, we get an error and resources are not reset', () => {
    resourcesState.new.byId = {
      id: {}
    }
    resourcesState.current.byId = {
      id: {
        apiState: {
          status: undefined
        }
      },
      current: {
        apiState: {
          status: undefined
        }
      }
    }
    resourcesState.new.allIds = ['id', 'current']
    resourcesState.current.currentIds = ['current']
    expect(() => {
      resourcesActions.resetCurrentResources(['id', 'something-else'])
    }).toThrowError('Cannot set current resource ID \'something-else\'. It does not exist.')
    expect(resourcesState.new.byId).toStrictEqual({
      id: {}
    })
    expect(resourcesState.new.allIds).toStrictEqual(['id', 'current'])
    expect(resourcesState.current.currentIds).toStrictEqual(['current'])
  })
})

describe('resources action setResourceFetchStatus', () => {
  const resourcesState = state()
  const resourcesActions = actions(resourcesState)
  test('We can set the status on a new resource', () => {
    resourcesActions.setResourceFetchStatus({ iri: 'id', isComplete: false })
    expect(resourcesState.current.byId.id.apiState.status).toBe(0)
    expect(resourcesState.current.allIds).toStrictEqual(['id'])
    expect(resourcesState.current.currentIds).toStrictEqual(['id'])
  })
  test('We can set the status on an existing resource', () => {
    resourcesActions.setResourceFetchStatus({ iri: 'id', isComplete: true })
    expect(resourcesState.current.byId.id.apiState.status).toBe(1)
  })
  test('We clear existing fetch errors when setting a new status', () => {
    resourcesState.current.byId.id.apiState = {
      status: CwaResourceApiStatuses.ERROR,
      error: {
        statusCode: 101,
        message: 'any'
      }
    }
    resourcesActions.setResourceFetchStatus({ iri: 'id', isComplete: true })
    expect(resourcesState.current.byId.id.apiState.status).toBe(1)
    expect(resourcesState.current.byId.id.apiState.error).toBeUndefined()
  })
})

describe('resources action setResourceFetchError', () => {
  let resourcesState: CwaResourcesStateInterface
  let resourcesActions: CwaResourcesActionsInterface

  beforeEach(() => {
    resourcesState = state()
    resourcesActions = actions(resourcesState)
  })

  test('We can set an error on a new resource', () => {
    resourcesActions.setResourceFetchError({ iri: 'id' })
    expect(resourcesState.current.byId.id.apiState.status).toBe(-1)
    expect(resourcesState.current.byId.id.apiState.error).toBeUndefined()
    expect(resourcesState.current.allIds).toStrictEqual(['id'])
    expect(resourcesState.current.currentIds).toStrictEqual(['id'])
  })

  test('We can set an error on a new resource that is no longer current', () => {
    resourcesActions.setResourceFetchError({ iri: 'id', isCurrent: false })
    expect(resourcesState.current.byId.id.apiState.status).toBe(-1)
    expect(resourcesState.current.byId.id.apiState.error).toBeUndefined()
    expect(resourcesState.current.allIds).toStrictEqual(['id'])
    expect(resourcesState.current.currentIds).toStrictEqual([])
  })

  test('We can set an error on a new resource with a fetch error', () => {
    const error: CwaResourceError = createCwaResourceError(new Error('Any error'))
    resourcesActions.setResourceFetchError({ iri: 'id', error })
    expect(resourcesState.current.byId.id.apiState.status).toBe(-1)
    expect(resourcesState.current.byId.id.apiState.error).toStrictEqual(error.asObject)
  })

  test('We can set the status on an existing resource', () => {
    const error: CwaResourceError = createCwaResourceError(new Error('Any error'))
    resourcesActions.setResourceFetchError({ iri: 'id', error })
    expect(resourcesState.current.byId.id.apiState.status).toBe(-1)
    expect(resourcesState.current.byId.id.apiState.error).toStrictEqual(error.asObject)
  })
})

describe('resources action saveResource', () => {
  const resourcesState = state()
  const resourcesActions = actions(resourcesState)

  test.each([{ action: 'save' }, { action: 'overwrite' }])('We can $type a new resource', ({ action }) => {
    const resource = {
      '@id': 'id',
      '@type': 'type',
      _metadata: {
        persisted: false
      },
      action
    }
    resourcesActions.saveResource({
      resource,
      isNew: true
    })
    expect(resourcesState.new.byId).toStrictEqual({
      id: resource
    })
    expect(resourcesState.new.allIds).toStrictEqual(['id'])
  })

  test.each([{ action: 'save' }, { action: 'overwrite' }])('We can $type a current resource', ({ action }) => {
    const resource = {
      '@id': 'id',
      '@type': 'type',
      _metadata: {
        persisted: false
      },
      action
    }
    resourcesActions.saveResource({
      resource
    })
    expect(resourcesState.current.byId.id.data).toStrictEqual(resource)
    expect(resourcesState.current.allIds).toStrictEqual(['id'])
    expect(resourcesState.current.currentIds).toStrictEqual(['id'])
  })
})
