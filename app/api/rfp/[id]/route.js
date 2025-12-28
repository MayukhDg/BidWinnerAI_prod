import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

export async function GET(req, { params }) {
  try {
    const { id } = params;
    if (!id) return new Response('Missing ID', { status: 400 });

    const rfpsCollection = await getCollection('rfps');
    const questionsCollection = await getCollection('rfpQuestions');

    const rfp = await rfpsCollection.findOne({ _id: new ObjectId(id) });
    if (!rfp) return new Response('RFP not found', { status: 404 });

    const questions = await questionsCollection.find({ rfpId: new ObjectId(id) }).toArray();

    return Response.json({ rfp, questions });
  } catch (error) {
    console.error('Error fetching RFP:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const { title } = await req.json();
    
    if (!id || !title) return new Response('Missing ID or title', { status: 400 });

    const rfpsCollection = await getCollection('rfps');
    
    const result = await rfpsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { title, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return new Response('RFP not found', { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating RFP:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    if (!id) return new Response('Missing ID', { status: 400 });

    const rfpsCollection = await getCollection('rfps');
    const questionsCollection = await getCollection('rfpQuestions');

    // Delete RFP
    const result = await rfpsCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return new Response('RFP not found', { status: 404 });
    }

    // Delete associated questions
    await questionsCollection.deleteMany({ rfpId: new ObjectId(id) });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting RFP:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
