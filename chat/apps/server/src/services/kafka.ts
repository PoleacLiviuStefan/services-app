import { config } from "dotenv"
import path       from "path"

// 1️⃣ Încarcă .env *îna­inte* de orice alt import
config({ path: path.resolve(__dirname, "../../../.env") })

import { Kafka, KafkaJSDeleteGroupsError, Producer } from "kafkajs"

import fs from "fs"
import db from "./prisma"


const kafka = new Kafka({
  brokers: process.env.KAFKA_URL!.split(","),
  // nu ai ssl/sasl aici
});

let producer: null | Producer = null

const createProducer = async () => {
    if (producer) return producer

    const _producer = kafka.producer()
    await _producer.connect()
    producer = _producer

    return producer

}

const produceMessage = async (message: string) => {
    const producer = await createProducer()

    await producer.send({
        messages: [{
            key: `message-${Date.now()}`, value: message 
        }],
        topic: "MESSAGES"
    })

    return true
}

const consumeMessage = async () => {
    const consumer = kafka.consumer({ groupId: "default" })

    await consumer.connect()
    await consumer.subscribe({ topic: "MESSAGES", fromBeginning: true })

    await consumer.run({
        autoCommit: true,
        eachMessage: async ({ message, pause }) => {
            if(!message.value) return 

            console.log("Kafka broker consumed message")
            try {
                await db.message.create({
                    data: {
                        content: message.value?.toString(), 
                        username: ""
                    }
                })
            } catch (error) {
                console.log("Database write error")
                pause()
                setTimeout(() => {
                        consumer.resume([{topic: "MESSAGES"}])
                }, 60 * 1000)
            }
        }
    })

}

export { kafka, createProducer, produceMessage, consumeMessage }