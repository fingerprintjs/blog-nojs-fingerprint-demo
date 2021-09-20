import initApp from './app'

const port = Number(process.env.PORT || 8080)

initApp().then((app) => {
  app.listen(port, () => {
    console.log(`Serving the app on port ${port}`)
  })
})
