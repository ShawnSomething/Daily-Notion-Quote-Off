const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const NOTION_API_KEY = 'ADD IN YOUR NOTION API KEY'; //Generate this from Notion - Remember to link the api app to the pages you want to link
const PAGE_ID = 'ADD IN YOU NOTION PAGE ID';
const RECEIVER_EMAIL = 'ADD IN YOUR EMAIL';

const headers = {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': '2021-08-16', // Replace with the latest Notion API version
  };
  
  // Fetch all block IDs from Notion page
  async function getAllBlockIds(pageId) {
    let allBlockIds = [];
    let startCursor = null;
  
    do {
      const queryParams = startCursor ? `start_cursor=${startCursor}` : '';
      const url = `https://api.notion.com/v1/blocks/${pageId}/children?${queryParams}`;
      
      try {
        const response = await axios.get(url, { headers });
        const { results, next_cursor } = response.data;
  
        const blockIds = results.map(block => block.id);
        allBlockIds = allBlockIds.concat(blockIds);
        startCursor = next_cursor;
      } catch (error) {
        console.error('Error fetching blocks:', error.message);
        break;
      }
    } while (startCursor);
  
    return allBlockIds;
  }
  
  // Get plain text content of a block
  async function getBlockPlainText(blockId) {
    const url = `https://api.notion.com/v1/blocks/${blockId}`;
    
    try {
      const response = await axios.get(url, { headers });
      const blockData = response.data;
      
      if (blockData.type === 'paragraph') {
        return blockData.paragraph.text.map(textObj => textObj.plain_text).join('');
      } else if (blockData.type === 'heading_1' || blockData.type === 'heading_2' || blockData.type === 'heading_3') {
        return blockData[blockData.type].text.map(textObj => textObj.plain_text).join('');
      } else if (blockData.type === 'callout') {
        return blockData.callout.text.map(textObj => textObj.plain_text).join('');
      }
      
      return ''; // Return empty string for unsupported block types
    } catch (error) {
      console.error(`Error fetching block ${blockId}:`, error.message);
      return '';
    }
  }
  
  // Get random plain text from a block
  async function getRandomPlainText(allBlockIds) {
    const randomIndex = Math.floor(Math.random() * allBlockIds.length);
    const randomBlockId = allBlockIds[randomIndex];
    const plainText = await getBlockPlainText(randomBlockId);
    return plainText;
  }
  
  (async () => {
    try {
      const blockIds = await getAllBlockIds(PAGE_ID);
      const randomPlainText = await getRandomPlainText(blockIds);
      console.log(randomPlainText);
    } catch (error) {
      console.error('Error:', error.message);
    }
  })();

  // Send email with random text
async function sendEmailWithRandomText(randomPlainText) {
  try {
      // Create a nodemailer transporter
      const transporter = nodemailer.createTransport({
          service: 'Gmail', // You can change to another email service
          auth: {
              user: 'YOUR EMAIL', // Replace with your email address
              pass: 'YOUR PASSWORD', // Replace with your email password - Gmail doesn't let you use your own password, so you will need to go into the security settings to generate an app specific password
          },
      });

      // Define email options
      const mailOptions = {
          from: 'YOUR_EMAIL', // Replace with your email address
          to: RECEIVER_EMAIL,
          subject: 'Quote Block', // You can change the title of the email from here
          text: randomPlainText,
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error('Error sending email:', error.message);
          } else {
              console.log('Email sent:', info.response);
          }
      });
  } catch (error) {
      console.error('Error:', error.message);
  }
}

// Schedule the task to run every day at 7:30 AM AEST (UTC+10)
cron.schedule('0 5 * * *', async () => {
  try {
      const blockIds = await getAllBlockIds(PAGE_ID);
      const randomPlainText = await getRandomPlainText(blockIds);
      sendEmailWithRandomText(randomPlainText);
  } catch (error) {
      console.error('Error:', error.message);
  }
});
