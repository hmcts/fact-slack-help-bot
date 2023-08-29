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
        caseReferenceNumbers,
        contactedThirdParty,
        date,
        time,
        slackLink
    }) {
    return `
h6. _This is an automatically generated ticket created from Slack, do not reply or update in here, [view in Slack|${slackLink}]_

*Service affected*: ${service}

*Environment affected*: ${environment}

*Occurred*: ${date} at ${time}

*Issue description*:

${description}

*Analysis done so far*: 

${analysis}

${caseReferenceNumbers !== "N/A" ? '*Case reference numbers*: ' + caseReferenceNumbers : ''}

${contactedThirdParty !== "N/A" ? '*Contacted Exela/Xerox?*: ' + contactedThirdParty : ''}

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
