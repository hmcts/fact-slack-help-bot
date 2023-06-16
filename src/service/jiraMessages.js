function optionalField(prefix, value) {
    if (value) {
        return `*${prefix}*: ${value}`
    }
    return ""
}

function mapFieldsToDescription(
    {
        service,
        environment,
        description,
        analysis,
        date,
        time,
        slackLink
    }) {
    return `
h6. _This is an automatically generated ticket created from Slack, do not reply or update in here, [view in Slack|${slackLink}]_

*Service affected*: ${service}

*Environment affected*: ${environment}

*Occured*: ${date} at ${time}

*Issue description*:

${description}

*Analysis done so far*: 

${analysis}

`
}

function createComment({slackLink, name, message}) {
return `
h6. _This is an automatically added comment created from Slack, do not reply or update in here, [view in Slack|${slackLink}]_

h6. ${name}:
${message}
`
}

module.exports = {
    mapFieldsToDescription,
    createComment
}
