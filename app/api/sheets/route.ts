import { auth } from "@/auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const drive = google.drive({ version: "v3", auth: oauth2Client })

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='createdBy' and value='gymer' } and trashed = false",
      fields: "files(id, name, modifiedTime, webViewLink)",
      orderBy: "modifiedTime desc",
      pageSize: 50,
    })

    return NextResponse.json({ sheets: response.data.files || [] })
  } catch (error) {
    console.error("Error fetching sheets:", error)
    return NextResponse.json(
      { error: "Failed to fetch sheets" },
      { status: 500 }
    )
  }
}
