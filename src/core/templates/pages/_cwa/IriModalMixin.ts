import Vue from 'vue'
import {
  NotificationEvent,
  NotificationLevels
} from '../../components/cwa-api-notifications/types'
import ApiError from '../../../../inc/api-error'
import { NOTIFICATION_EVENTS } from '../../../events'
import ApiErrorNotificationsMixin from '../../../mixins/ApiErrorNotificationsMixin'

export const notificationCategories = {
  violations: 'iri-modal.violations'
}

export default Vue.extend({
  mixins: [ApiErrorNotificationsMixin],
  data() {
    return {
      iri: null,
      component: {
        reference: ''
      },
      isLoading: true,
      notificationCategories,
      notifications: {}
    } as {
      iri: string
      component: any
      isLoading: boolean
      notificationCategories: {
        violations: string
      }
      notifications: { [key: string]: NotificationEvent[] }
    }
  },
  computed: {
    isNew() {
      return this.iri === 'add'
    },
    isSaved() {
      return this.$cwa.isResourceSame(this.component, this.savedComponent)
    },
    inputProps() {
      return (key) => ({
        id: `component-${key}`,
        required: true,
        notifications: this.notifications[key],
        isLoading: this.isLoading
      })
    },
    iriModalProps() {
      return {
        notificationCategories: Object.values(this.notificationCategories),
        isSaved: this.isSaved,
        isNew: this.isNew,
        component: this.component,
        showLoader: this.isLoading
      }
    },
    savedComponent: {
      get() {
        return this.$cwa.getResource(this.iri)
      },
      set(newResource) {
        this.$cwa.saveResource(newResource)
      }
    }
  },
  watch: {
    iri() {
      this.findIriResource()
    }
  },
  async mounted() {
    if (this.isNew || !this.iri) {
      this.isLoading = false
      return
    }
    await this.findIriResource()
  },
  methods: {
    async findIriResource() {
      this.isLoading = true
      this.component = Object.assign({}, await this.$cwa.findResource(this.iri))
      this.component.uiClassNames = this.component?.uiClassNames?.join(', ')
      this.isLoading = false
    },
    async sendRequest(data) {
      this.notifications = {}
      this.isLoading = true
      let endpoint = null
      try {
        if (this.isNew) {
          if (!this.postEndpoint) {
            throw new Error(
              'You should use IriPageMixin or extend IriModalMixin to include the postEndpoint variable to create a new resource'
            )
          }
          endpoint = this.postEndpoint
          const newRoute = await this.$cwa.createResource(endpoint, data)
          this.iri = newRoute['@id']
        } else {
          endpoint = this.iri
          await this.$cwa.updateResource(endpoint, data)
        }
        this.$emit('change')
        return true
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error
        }
        if (error.violations) {
          // this.processViolations(error.violations)
          this.handleApiViolations(
            error.violations,
            endpoint,
            this.notificationCategories.violations
          )
        }

        if (error.statusCode === 500) {
          const notification: NotificationEvent = {
            code: 'server_error',
            title: 'An error occurred',
            message: error.message,
            level: NotificationLevels.ERROR,
            category: this.notificationCategories.violations
          }
          this.$cwa.$eventBus.$emit(NOTIFICATION_EVENTS.add, notification)
        }
        return false
      } finally {
        this.isLoading = false
      }
    },
    // processViolations(violations) {
    //   violations.forEach((violation: Violation) => {
    //     const notification: NotificationEvent = {
    //       code: violation.propertyPath,
    //       title: violation.propertyPath,
    //       message: violation.message,
    //       level: NotificationLevels.ERROR,
    //       category: this.notificationCategories.violations
    //     }
    //     this.$cwa.$eventBus.$emit(NOTIFICATION_EVENTS.add, notification)
    //     const fieldNotifications =
    //       this.notifications[violation.propertyPath] || []
    //     fieldNotifications.push(notification)
    //     this.notifications[violation.propertyPath] = fieldNotifications
    //   })
    // },
    async deleteComponent() {
      this.isLoading = true
      await this.$cwa.deleteResource(this.iri)
      this.$emit('change')
      this.isLoading = false
    }
  }
})
