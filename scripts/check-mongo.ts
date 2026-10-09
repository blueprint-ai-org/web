import 'dotenv/config'
import mongoose from 'mongoose'
const url = process.env.MONGODB_URL
if (!url) { console.error('MONGODB_URL not set'); process.exit(1) }
await mongoose.connect(url)
console.log('connected:', mongoose.connection.name)
await mongoose.disconnect()
