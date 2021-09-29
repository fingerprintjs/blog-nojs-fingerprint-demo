import dotenv from 'dotenv'
import initApp from './app'

dotenv.config()

const port = Number(process.env.SERVER_PORT || 8080)

initApp().then((app) => {
  app.listen(port, () => {
    console.log(`Serving the app on port ${port}`)
  })
})
