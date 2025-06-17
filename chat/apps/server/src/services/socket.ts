import { Server, Socket } from "socket.io"
import { produceMessage } from "./kafka"
import Redis from "ioredis"
import "dotenv/config"
import db from "./prisma"

const redis = new Redis({
  host:     process.env.REDIS_HOST,            // ex: "redis-scalable-ws-chat.a.aivencloud.com"
  port:     Number(process.env.REDIS_PORT),    // ex: 10192
  username: process.env.REDIS_USER,            // ex: "default"
  password: process.env.REDIS_PASSWD,          // pusa în .env.local ca REDIS_PASSWD=<parola-ta>
  tls:      {},                                // Aiven Redis cere TLS implicit
  maxRetriesPerRequest: 5,
}); 

const pub = new Redis(redisConfig) // Publisher
const sub = new Redis(redisConfig) // Subscriber

export class SocketService {
    private _io: Server

    constructor(){
        console.log("Web socket server started")
        this._io = new Server({
            cors: {
                allowedHeaders: ["*"],
                origin: "*",
            }
        })
        sub.subscribe("MESSAGES")
    }

    get io(){
        return this._io
    }

    public initListeners(){
        const io = this._io
        console.log("Initialsied web socket event listeners")

        io.on("connect", (socket) => {  
            console.log("New web socket connectin established", socket.id)
            socket.on("event:message", async ({ message, username }: { message: string, username: string }) => {
                console.log(username, message)
                await pub.publish("MESSAGES", JSON.stringify({ message, username }))
            })
        })

        sub.on("message", async (channel, msg) => {
            if(channel === "MESSAGES"){
                const { message, username } = JSON.parse(msg)
                io.emit("message", { message , username })
                await produceMessage(message)
                console.log("Kafka broker produced message")
            }
        })
    }
}
