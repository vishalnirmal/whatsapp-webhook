// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import axios from "axios";

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case "GET":
        if (req.query["hub.verify_token"] === process.env.WHATSAPP_SECRET) {
          return res.send(req.query["hub.challenge"]);
        }
        return res.status(400);

      case "POST":
        console.log(JSON.stringify(req.body), "content");
        if (
          req.body.entry[0]?.changes[0]?.value.statuses ||
          req.body.entry[0]?.changes[0]?.value.messages[0]?.type !== "text"
        )
          return res.status(200).send();

        const message =
          req.body.entry[0]?.changes[0]?.value.messages[0]?.text.body;
        const phoneNumber =
          req.body.entry[0]?.changes[0]?.value.messages[0]?.from;
        const phoneNumberId =
          req.body.entry[0]?.changes[0]?.value?.metadata?.phone_number_id;

        console.log(phoneNumber, "phone number");
        console.log(message, "message");

        if (!message || !phoneNumber || !phoneNumberId)
          return res.status(200).send();

        const gptRes = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: message,
              },
            ],
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        const gptResponse = gptRes.data.choices[0]?.message?.content;
        console.log(gptResponse, "chatGpt response");

        await axios.post(
          `https://graph.facebook.com/v16.0/${phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to: phoneNumber,
            text: {
              body: gptResponse,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        return res.status(200).send();

      default:
        return res.status(404).send();
    }
  } catch (error) {
    console.log(error);
  }
}
