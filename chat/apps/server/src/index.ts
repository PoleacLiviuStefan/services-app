import { config } from "dotenv"
import path     from "path"

// 1) load .env _before_ anything else
config({ path: path.resolve(__dirname, "../../../.env") })

import { consumeMessage } from "./services/kafka"
import { SocketService }  from "./services/socket"
import http                from "http"

;(async () => {
  // now process.env.KAFKA_URL is defined
  await consumeMessage()
  const socketService = new SocketService()
  const httpServer    = http.createServer()
  const PORT          = process.env.PORT || 8000

  socketService.io.attach(httpServer)
  socketService.initListeners()

  httpServer.listen(PORT, () => {
    console.log("Http server started at port:", PORT)
  })
})()
