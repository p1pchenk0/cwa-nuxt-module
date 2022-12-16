import { CwaResource } from '../../../resources/resource-utils'
import { CwaResourceError } from '../../../errors/cwa-resource-error'
import { CwaCurrentResourceInterface, CwaResourceApiStatuses, CwaResourcesStateInterface } from './state'

export interface SaveResourceEvent { resource: CwaResource, isNew?: boolean }
export interface SetResourceStatusEvent { iri: string, isComplete: boolean }
export interface SetResourceFetchErrorEvent { iri: string, error?: CwaResourceError, isCurrent?: boolean }

export interface CwaResourcesActionsInterface {
  resetCurrentResources (currentIds?: string[]): void
  setResourceFetchStatus (event: SetResourceStatusEvent): void
  setResourceFetchError (event: SetResourceFetchErrorEvent): void
  saveResource(event: SaveResourceEvent): void
}

interface InitResourceEvent {
  iri: string
  resourcesState: CwaResourcesStateInterface
  isCurrent: boolean
}

export default function (resourcesState: CwaResourcesStateInterface): CwaResourcesActionsInterface {
  function initResource ({ iri, resourcesState, isCurrent }: InitResourceEvent): CwaCurrentResourceInterface {
    if (!resourcesState.current.byId[iri]) {
      resourcesState.current.byId[iri] = {
        apiState: {
          status: undefined
        }
      }
    }
    if (!resourcesState.current.allIds.includes(iri)) {
      resourcesState.current.allIds.push(iri)
    }
    if (isCurrent && !resourcesState.current.currentIds.includes(iri)) {
      resourcesState.current.currentIds.push(iri)
    }
    return resourcesState.current.byId[iri]
  }

  return {
    resetCurrentResources (currentIds?: string[]): void {
      if (currentIds) {
        for (const currentId of currentIds) {
          if (!resourcesState.current.byId[currentId]) {
            throw new Error(`Cannot set current resource ID '${currentId}'. It does not exist.`)
          }
        }
      }
      resourcesState.new = {
        byId: {},
        allIds: []
      }
      resourcesState.current.currentIds = currentIds || []
    },
    setResourceFetchStatus ({ iri, isComplete }: SetResourceStatusEvent): void {
      const data = initResource({
        resourcesState,
        iri,
        isCurrent: true
      })
      data.apiState = {
        status: isComplete ? CwaResourceApiStatuses.SUCCESS : CwaResourceApiStatuses.IN_PROGRESS
      }
    },
    setResourceFetchError ({ iri, error, isCurrent }: SetResourceFetchErrorEvent): void {
      const data = initResource({
        resourcesState,
        iri,
        isCurrent: isCurrent === undefined ? true : isCurrent
      })
      data.apiState = {
        status: CwaResourceApiStatuses.ERROR,
        error: error?.asObject
      }
    },
    saveResource ({ resource, isNew }: SaveResourceEvent): void {
      const iri = resource['@id']
      if (isNew === true) {
        resourcesState.new.byId[iri] = resource
        if (!resourcesState.new.allIds.includes(iri)) {
          resourcesState.new.allIds.push(iri)
        }
        return
      }

      const data = initResource({
        resourcesState,
        iri,
        isCurrent: true
      })
      data.data = resource
    }
  }
}
