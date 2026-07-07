import { s3 } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export async function POST(req: NextRequest){

    try{
        const body =await req.json()
        const {fileName, contentType} = body;
        if(!fileName || !contentType){
            return NextResponse.json({error: "Missing fileName or contentType"}, { status: 400 });
        }
        const extension = fileName.split('.').pop();
        const storageKey = `videos/${randomUUID()}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: storageKey,
            ContentType: contentType,
        });
        
        const uploadUrl = await getSignedUrl
        (s3, command, { expiresIn: 3600 });

        return NextResponse.json({ uploadUrl, storageKey });

    }catch(err){
        console.error(err);
        return NextResponse.json({error: "failed to generate upload URL"}, { status: 500 });
    }
}