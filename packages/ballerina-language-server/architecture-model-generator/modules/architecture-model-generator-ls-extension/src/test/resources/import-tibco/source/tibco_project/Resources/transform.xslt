<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:pd="http://xmlns.tibco.com/bw/process/2003" xmlns:ns="http://www.tibco.com/pe/EngineTypes"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema" version="2.0">
    <xsl:param name="HTTP-Receiver" />
    <xsl:template name="Transform2" match="/">
        <ActivityInput>
            <message>
                <xsl:value-of select="$HTTP-Receiver/payload"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" />
            </message>
        </ActivityInput>
    </xsl:template>
</xsl:stylesheet>
