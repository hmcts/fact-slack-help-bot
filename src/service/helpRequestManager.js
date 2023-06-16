const {createHelpRequest, updateHelpRequestDescription} = require("./persistence");
const {helpRequestRaised, helpRequestDetails} = require("../messages");
const config = require('@hmcts/properties-volume').addTo(require('config'))

const reportChannel = config.get('slack.report_channel');

async function handleSupportRequest(client, user, helpRequest) {
    const userEmail = await getUserEmail(client, user)
    const jiraId = await createHelpRequest(helpRequest, userEmail);
    console.log(`Support request ${jiraId} created in Jira from ${reportChannel}`)

    const permaLink = await postSlackMessages(client,
        helpRequestRaised({
            ...helpRequest,
            jiraId
        }),
        helpRequestDetails(helpRequest),
    )

    await updateHelpRequestDescription(jiraId, {
        ...helpRequest,
        slackLink: permaLink
    })
}

async function getUserEmail(client, user) {
    return (await client.users.profile.get({
        user
    })).profile.email
}

async function getPermaLink(client, result) {
    return (await client.chat.getPermalink({
        channel: result.channel,
        'message_ts': result.message.ts
    })).permalink
}

async function postSlackMessages(client, requestInfoBlocks, requestDetailsBlocks) {
    const result = await client.chat.postMessage({
        channel: reportChannel,
        text: 'New support request raised',
        blocks: requestInfoBlocks
    })

    if (requestDetailsBlocks !== undefined) {
        await client.chat.postMessage({
            channel: reportChannel,
            thread_ts: result.message.ts,
            text: 'New support request raised',
            blocks: requestDetailsBlocks
        })
    }

    return getPermaLink(client, result)
}

module.exports = {
    handleSupportRequest,
}