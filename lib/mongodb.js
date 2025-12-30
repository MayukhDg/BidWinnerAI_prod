import mongoose from 'mongoose';
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const connectPromise = mongoose
  .connect(uri, {
    // useUnifiedTopology / useNewUrlParser are not needed in Mongoose v6+
  })
  .then(() => mongoose)
  .catch((err) => {
    console.error('Mongoose connection error:', err);
    throw err;
  });

// Define schemas
const { Schema } = mongoose;

const UserSchema = new Schema({
  clerkId: { type: String, index: true },
  email: String,
  name: String,
  subscriptionTier: { type: String, default: 'free' },
  polarCustomerId: String,
  credits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

const DocumentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  fileName: String,
  fileUrl: String,
  fileKey: String,
  fileType: String,
  uploadedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'processing' },
  chunkCount: { type: Number, default: 0 },
});

const DocumentChunkSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  chunkIndex: Number,
  content: String,
  embedding: { type: [Number], index: false },
  metadata: Schema.Types.Mixed,
});

const OrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  polarOrderId: String,
  polarCustomerId: String,
  amount: Number,
  currency: String,
  status: String,
  productId: String,
  creditsAdded: Number,
  createdAt: { type: Date, default: Date.now },
});

const RFPSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
  title: String,
  status: { type: String, default: 'draft' }, // draft, processing, completed
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

const RFPQuestionSchema = new Schema({
  rfpId: { type: Schema.Types.ObjectId, ref: 'RFP', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  question: String,
  answer: String,
  status: { type: String, default: 'pending' }, // pending, drafted, approved, done
  assignedTo: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// Register models if not already registered (prevents model overwrite in dev HMR)
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
const DocumentChunk = mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', DocumentChunkSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const RFP = mongoose.models.RFP || mongoose.model('RFP', RFPSchema);
const RFPQuestion = mongoose.models.RFPQuestion || mongoose.model('RFPQuestion', RFPQuestionSchema);

const modelMap = {
  users: User,
  documents: Document,
  documentChunks: DocumentChunk,
  orders: Order,
  rfps: RFP,
  rfpQuestions: RFPQuestion,
};

function wrapModel(model) {
  return {
    findOne: async (filter) => model.findOne(filter).lean(),
    find: (filter) => {
      const q = model.find(filter).lean();
      return {
        sort: (sortObj) => {
          q.sort(sortObj);
          return { limit: (n) => ({ toArray: async () => q.limit(n).exec() }), toArray: async () => q.exec() };
        },
        limit: (n) => ({ toArray: async () => q.limit(n).exec() }),
        toArray: async () => q.exec(),
      };
    },
    insertOne: async (doc) => {
      const created = await model.create(doc);
      return { insertedId: created._id };
    },
    insertMany: async (docs) => model.insertMany(docs),
    updateOne: async (filter, update, options) => model.updateOne(filter, update, options),
    findOneAndUpdate: async (filter, update, options) => model.findOneAndUpdate(filter, update, { ...options, new: options?.returnDocument === 'after' }).lean(),
    findOneAndDelete: async (filter) => model.findOneAndDelete(filter).lean(),
    deleteOne: async (filter) => model.deleteOne(filter),
    deleteMany: async (filter) => model.deleteMany(filter),
    aggregate: async (pipeline) => model.aggregate(pipeline).exec(),
    countDocuments: async (filter) => model.countDocuments(filter).exec ? await model.countDocuments(filter).exec() : await model.countDocuments(filter),
    estimatedDocumentCount: async () => model.estimatedDocumentCount ? await model.estimatedDocumentCount().exec() : await model.estimatedDocumentCount(),
  };
}

export async function getCollection(collectionName) {
  await connectPromise;
  const model = modelMap[collectionName];
  if (model) return wrapModel(model);
  // Fallback to raw collection
  const conn = mongoose.connection;
  return conn.collection(collectionName);
}

export default connectPromise;
