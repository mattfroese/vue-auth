# VueAuth with VueRouter

First, pass router into Vue.use when setting up ``vue-auth``

```javascript
Vue.use(Auth, {
	router
})
```

Then define which routes require auth:

```javascript
const routes = [{
	path: '/',
	component: require('./Home.vue')
},{
	path: '/protected',
	component: require('./ProtectMe.vue')
	meta: { auth: true } // I need auth
}]
```
