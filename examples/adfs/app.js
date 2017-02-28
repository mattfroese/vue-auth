import Vue from 'vue'
import VueResource from 'vue-resource'
import VueAuth from 'vue-auth'
import App from './components/App.vue'

Vue.use(VueResource);
Vue.use(VueAuth,{});

/* eslint-disable no-new */
new Vue({
  el: '#app',
  // replace the content of <div id="app"></div> with App
  render: h => h(App)
})
