import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const questionsCollection = await getCollection('rfpQuestions');
    const question = await questionsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!question) return new Response('Question not found', { status: 404 });
    
    return Response.json(question);
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { answer, assignedTo, status } = body;
    
    const questionsCollection = await getCollection('rfpQuestions');
    
    const update = {};
    if (answer !== undefined) update.answer = answer;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (status !== undefined) update.status = status;
    update.updatedAt = new Date();
    
    await questionsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    
    return Response.json({ success: true });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const questionsCollection = await getCollection('rfpQuestions');
    
    const result = await questionsCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return new Response('Question not found', { status: 404 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
