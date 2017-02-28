import {
  error,
  parseToken
} from './util'

const auth = {
  defaults: {
    url: '/api',
    loginUrl: '/login',
    logoutUrl: '/logout',
    refreshUrl: '/refresh',
    unauthorizedRedirect: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    scope: null
  },
  install(Vue, opts) {
    if (auth.installed) {
      return
    }
    // setup
    var vm = new Vue({
      data: {
        refreshToken: null,
        accessToken: null,
        expires: null,
        user: null,
        notBefore: null,
        issuedAt: null,
        loading: false,
        checking: false,
        expiryTimer: null
      },
      computed: {
        expiresIn() {
          return this.expires ? (this.expires * 1000) - Date.now() : false
        }
      }
    })

    let self = Vue.prototype.$auth = vm
    let options = Object.assign(auth.defaults, opts)

    let http = Vue.http
    let router = opts.router

    if (!http) {
      console.error('Auth requires vue-resource. Make sure you Vue.use(VueResource) before Vue.use(VueAuth)')
    }
    if (!router) {
      console.info('To use with vue-router, pass it to me Vue.use(VueAuth, {router})')
    } else {
      router.beforeEach((to, from, next) => {
        var $auth = options.router.app.$auth
        if (to.meta.auth && $auth.user === null) {
          $auth.authenticate().then(function() {
            next()
          }, function(e) {
            if (e.redirect)
              window.location.href = e.redirect
            if (options.unauthorized_redirect)
              next({
                path: options.unauthorized_redirect
              })
          })
        } else {
          next()
        }
      })
    }

    // bind events
    window.onfocus = function() {
      self.attemptRefresh()
    }

    // methods
    self.uri = function(endpoint) {
      return options.url + options[endpoint + 'Url']
    }
    self.authenticate = function() {
      if (self.tokenValid()) return Promise.resolve()
      var params = {}
      if (options.scope) params.scope = options.scope
      if (options.redirect) params.redirect = options.redirect
      return self.attachRequestQuarterback(http.get(this.uri('login'), {
        credentials: true,
        params: params
      }))
    }
    self.refresh = function() {
      return self.attachRequestQuarterback(http.post(this.uri('refresh'), {
        token: self.refreshToken
      }))
    }
    self.login = function(data) {
      var params = {
        data
      }
      return self.attachRequestQuarterback(http.post(this.uri('login'), {
        credentials: true,
        params: params
      }))
    }
    self.logout = function() {
      self.refreshToken = null
      self.accessToken = null
      self.user = null
      self.expires = null
      self.issuedAt = null
      self.notBefore = null
      return Promise.resolve()
    }
    self.attachRequestQuarterback = function(promise) {
      self.loading = true
      return promise.then(function(r) {
        self.receivethMightyToken(r.data)
        return Promise.resolve()
      }).catch(function(e) {
        return error(e)
      }).finally(function() {
        self.loading = false
      })
    }
    self.receivethMightyToken = function(tokenIsMightier) {
      var accessToken = tokenIsMightier[options.accessToken]
      var refreshToken = tokenIsMightier[options.refreshToken]
      if (accessToken == undefined) return error('No token received')
      var decodedAccessToken = parseToken(accessToken)
      self.accessToken = accessToken
      self.user = tokenIsMightier.payload
      self.expires = decodedAccessToken.exp
      self.issuedAt = decodedAccessToken.iat
      self.notBefore = decodedAccessToken.nbf
      self.refreshToken = refreshToken
      self.attemptRefreshIn(self.expiresIn - 30000)
    }
    self.attemptRefreshIn = function(ms) {
      clearTimeout(self.expiryTimer)
      self.expiryTimer = setTimeout(function() {
        self.attemptRefresh()
      }, ms)
    }
    self.attemptRefresh = function() {
      var expiresIn = (self.expires * 1000) - Date.now()

      if (self.tokenValid() && expiresIn <= 300000) {
        self.authenticate().catch(function() {
          clearInterval(self.expiryTimer)
        })
      }
    }
    self.isLoggedIn = function() {
      return self.tokenValid()
    }
    self.tokenValid = function() {
      return self.refreshToken && ((self.expires * 1000) - Date.now()) > 0
    }
  }
}
export default auth
