const config = require('@hmcts/properties-volume').addTo(require('config'))
const setupSecrets = require('./src/modules/config');
// must be called before any config.get calls
setupSecrets.setup();

const { App } = require('@slack/bolt');
const {
    addCommentToHelpRequest,
    assignHelpRequest,
    extractJiraIdFromBlocks,
    transitionHelpRequest
} = require("./src/service/persistence");
const appInsights = require('./src/modules/appInsights')
const { convertProfileToName, replaceAsync } = require('./src/utils/helpers')

appInsights.enableAppInsights()

const app = new App({
    token: config.get('slack.bot_token'), //disable this if enabling OAuth in socketModeReceiver
    // logLevel: LogLevel.DEBUG,
    appToken: config.get('slack.app_token'),
    socketMode: true,
});

const reportChannel = config.get('slack.report_channel');
// can't find an easy way to look this up via API unfortunately :(
const reportChannelId = config.get('slack.report_channel_id');

//////////////////////////////////
//// Setup health check page /////
//////////////////////////////////

const http = require('http');
const { report } = require('process');
const {createSupportRequestStep} = require("./src/workflows/supportRequest");
const {updateActionsElement, getActionsElement, addNewActionsElement, removeActionsElement, updateStatus} = require("./src/utils/blockHelper");
const {button} = require("./src/utils/helpers");
const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
    appInsights.client().trackNodeHttpRequest({request: req, response: res});
    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end("error")
    } else if (req.url === '/health') {
        const connectionError = app.receiver.client.badConnection;
        if (connectionError) {
            res.statusCode = 500;
        } else {
            res.statusCode = 200;
        }
        const myResponse = {
            status: "UP",
            slack: {
                connection: connectionError ? "DOWN" : "UP",
            },
            node: {
                uptime: process.uptime(),
                time: new Date().toString(),
            }
        };
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(myResponse))
    } else if (req.url === '/health/liveness') {
        if (app.receiver.client.badConnection) {
            res.statusCode = 500
            res.end('Internal Server Error');
            return;
        }
        res.end('OK');
    } else if (req.url === '/health/readiness') {
        res.end(`<h1>slack-help-bot</h1>`)
    } else if (req.url === '/health/error') {
        // Dummy error page
        res.statusCode = 500;
        res.end(`{"error": "${http.STATUS_CODES[500]}"}`)
    } else {
        res.statusCode = 404;
        res.end(`{"error": "${http.STATUS_CODES[404]}"}`)
    }
})

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

//////////////////////////
//// Setup Slack Bolt ////
//////////////////////////

(async () => {
    await app.start();
    console.log('⚡️ Bolt app started');
})();

///////////////////////////////////
//// App actions and workflows ////
///////////////////////////////////

app.step(createSupportRequestStep());

app.action('start_help_request', async ({
    body, action, ack, client, context
}) => {
    try {
        await ack();
        const blocks = body.message.blocks
        const jiraId = extractJiraIdFromBlocks(blocks)

        await transitionHelpRequest(jiraId, "In Progress")
        updateStatus(blocks, ":large_blue_diamond: In progress");

        updateActionsElement(blocks, /start_help_request|resolve_help_request/,
            button(":mostly_sunny: Resolve", "resolve_help_request"))

        // Re-add the 'Withdraw' button after the issue has been re-opened
        if (getActionsElement(blocks, /withdraw_help_request/) === null) {
            addNewActionsElement(blocks, button(":wastebasket: Withdraw", "withdraw_help_request"))
        }

        await client.chat.update({
            channel: body.channel.id,
            ts: body.message.ts,
            text: `${jiraId} is now in progress`,
            blocks: blocks
        });
    } catch (error) {
        console.error(error);
    }
});


app.action('resolve_help_request', async ({
                                              body, action, ack, client, context, payload
                                          }) => {
    try {
        await ack();
        const blocks = body.message.blocks
        const jiraId = extractJiraIdFromBlocks(blocks)

        await transitionHelpRequest(jiraId, "Done")
        updateStatus(blocks, ":white_check_mark: Completed");

        updateActionsElement(blocks, /start_help_request|resolve_help_request/,
            button(":unlock: Re-open", "start_help_request"))
        removeActionsElement(blocks, /withdraw_help_request/)

        await client.chat.update({
            channel: body.channel.id,
            ts: body.message.ts,
            text: `${jiraId} is now resolved`,
            blocks: blocks
        });
    } catch (error) {
        console.error(error);
    }
});

app.action('withdraw_help_request', async ({
                                              body, action, ack, client, context, payload
                                          }) => {
    try {
        await ack();
        const blocks = body.message.blocks
        const jiraId = extractJiraIdFromBlocks(blocks)

        await transitionHelpRequest(jiraId, "Withdrawn")
        updateStatus(blocks, ":ballot_box_with_check: Withdrawn");

        updateActionsElement(blocks, /start_help_request|resolve_help_request/,
            button(":unlock: Re-open", "start_help_request"))
        removeActionsElement(blocks, /withdraw_help_request/)

        await client.chat.update({
            channel: body.channel.id,
            ts: body.message.ts,
            text: `${jiraId} is now withdrawn`,
            blocks: blocks
        });
    } catch (error) {
        console.error(error);
    }
});

app.action('assign_help_request_to_user', async ({
                                                     body, action, ack, client, context
                                                 }) => {
    try {
        await ack();
        const blocks = body.message.blocks
        const jiraId = extractJiraIdFromBlocks(blocks)
        const user = action.selected_user
        const actor = body.user.id
        const userEmail = (await client.users.profile.get({
            user
        })).profile.email

        await assignHelpRequest(jiraId, userEmail)

        await client.chat.postMessage({
            channel: body.channel.id,
            thread_ts: body.message.ts,
            text: `Hi, <@${user}>, you've just been assigned to this help request by <@${actor}>`
        });
    } catch (error) {
        console.error(error);
    }
});

app.action('assign_help_request_to_me', async ({
                                                   body, action, ack, client, context
                                               }) => {
    try {
        await ack();
        const blocks = body.message.blocks
        const jiraId = extractJiraIdFromBlocks(blocks)
        const user = (await client.users.profile.get({
            user: body.user.id
        })).profile

        await assignHelpRequest(jiraId, user.email)

        blocks[5].elements[0].initial_user = body.user.id

        await client.chat.update({
            channel: body.channel.id,
            ts: body.message.ts,
            text: `${jiraId} is now assigned to ${user.display_name}`,
            blocks: blocks
        });
    } catch (error) {
        console.error(error);
    }

})

app.event('message', async ({ event, context, client, say }) => {
    try {
        // filter unwanted channels in case someone invites the bot to it
        // and only look at threaded messages
        if (event.channel === reportChannelId && event.thread_ts) {
            const slackLink = (await client.chat.getPermalink({
                channel: event.channel,
                'message_ts': event.thread_ts
            })).permalink

            const user = (await client.users.profile.get({
                user: event.user
            }))

            const name = convertProfileToName(user.profile);

            const helpRequestMessages = (await client.conversations.replies({
                channel: reportChannelId,
                ts: event.thread_ts,
                limit: 200, // after a thread is 200 long we'll break but good enough for now
            })).messages

            if (helpRequestMessages.length > 0) {
                const jiraId = extractJiraIdFromBlocks(helpRequestMessages[0].blocks)

                const groupRegex = /<!subteam\^.+\|([^>.]+)>/g
                const usernameRegex = /<@([^>.]+)>/g

                let possibleNewTargetText = event.text.replace(groupRegex, (match, $1) => $1)

                const newTargetText = await replaceAsync(possibleNewTargetText, usernameRegex, async (match, $1) => {
                    const user = (await client.users.profile.get({
                        user: $1
                    }))
                    return `@${convertProfileToName(user.profile)}`
                });

                await addCommentToHelpRequest(jiraId, {
                    slackLink,
                    name,
                    message: newTargetText
                })
            } else {
                // either need to implement pagination or find a better way to get the first message in the thread
                console.warn("Could not find jira ID, possibly thread is longer than 200 messages, TODO implement pagination");
            }
        }
    } catch (error) {
        console.error(error);
    }
})