<template>
  <div id="app">
    <h1>ADFS</h1>
    {{$auth.user}}
  </div>
</template>

<script>
export default {
  data () {
    return {
      loggedIn: false
    }
  },
  created () {
  }
}
</script>
