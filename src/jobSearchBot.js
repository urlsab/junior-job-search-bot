const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

class JobSearchBot {
    constructor() {
        this.searchSites = [
            'https://www.jobmaster.co.il',
            'https://www.alljobs.co.il',
            'https://www.linkedin.com/jobs'
        ];
        this.keywords = ['junior', 'full stack', 'frontend', 'react', 'nodejs'];
        this.sentJobsFile = path.join(__dirname, 'sent_jobs.json');
        this.sentJobs = new Set();
    }

    async initializeSentJobs() {
        try {
            const data = await fs.readFile(this.sentJobsFile, 'utf8');
            this.sentJobs = new Set(JSON.parse(data));
        } catch (error) {
            // File doesn't exist, create it
            await fs.writeFile(this.sentJobsFile, JSON.stringify([]));
        }
    }

    async saveSentJobs() {
        await fs.writeFile(this.sentJobsFile, JSON.stringify(Array.from(this.sentJobs)));
    }

    async scrapeJobSites() {
        const newJobs = [];

        for (const site of this.searchSites) {
            try {
                const response = await axios.get(site);
                const $ = cheerio.load(response.data);

                // Example scraping logic (will need to be customized for each site)
                $('.job-listing').each((index, element) => {
                    const title = $(element).find('.job-title').text();
                    const link = $(element).find('a').attr('href');
                    const description = $(element).find('.job-description').text();

                    // Check if job matches keywords and hasn't been sent before
                    if (this.isRelevantJob(title, description) && !this.sentJobs.has(link)) {
                        newJobs.push({ title, link, description });
                        this.sentJobs.add(link);
                    }
                });
            } catch (error) {
                console.error(`Error scraping ${site}:`, error);
            }
        }

        return newJobs.slice(0, 10); // Limit to 10 new jobs
    }

    isRelevantJob(title, description) {
        const searchText = (title + ' ' + description).toLowerCase();
        return this.keywords.some(keyword => 
            searchText.includes(keyword.toLowerCase()) &&
            !searchText.includes('senior') &&
            !searchText.includes('lead')
        );
    }

    async sendJobsToTelegram(jobs) {
        const telegramBotToken = 'YOUR_TELEGRAM_BOT_TOKEN';
        const chatId = 'YOUR_CHAT_ID';

        for (const job of jobs) {
            const message = `
📝 New Junior Job Opportunity! 📝
🔹 Title: ${job.title}
🔗 Link: ${job.link}
📄 Description: ${job.description.substring(0, 200)}...
            `;

            try {
                await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                    chat_id: chatId,
                    text: message
                });
            } catch (error) {
                console.error('Error sending Telegram message:', error);
            }
        }
    }

    async runDailyJobSearch() {
        await this.initializeSentJobs();
        
        const newJobs = await this.scrapeJobSites();
        
        if (newJobs.length > 0) {
            await this.sendJobsToTelegram(newJobs);
            await this.saveSentJobs();
        }
    }

    startScheduler() {
        // Run every day at 9:00 AM
        cron.schedule('0 12 3 * *', async () => {
            console.log('Daily job search started...');
            await this.runDailyJobSearch();
        });

        console.log('Job search scheduler started.');
    }
}

// Initialize and start the job search bot
const jobSearchBot = new JobSearchBot();
jobSearchBot.startScheduler();

module.exports = jobSearchBot;