export type DeviceModelAvailability =
  | {
      status: 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available' | 'unknown'
      message: string
    }

interface PromptApi {
  availability(options?: {
    expectedInputs?: Array<{ type: 'text' | 'image'; languages?: string[] }>
    expectedOutputs?: Array<{ type: 'text'; languages?: string[] }>
  }): Promise<string>
}

export type DeviceModelInput = 'text' | 'image'

function getPromptApi(): PromptApi | undefined {
  return (globalThis as typeof globalThis & { LanguageModel?: PromptApi }).LanguageModel
}

export async function getDeviceModelAvailability(
  language: 'en' | 'fr' = 'en',
  inputType: DeviceModelInput = 'text',
): Promise<DeviceModelAvailability> {
  const promptApi = getPromptApi()
  if (!promptApi || typeof promptApi.availability !== 'function') {
    return {
      status: 'unsupported',
      message:
        'Chrome Prompt API is not available in this browser. Firebase documents on-device web inference for desktop Chrome; support also depends on device capability.',
    }
  }

  try {
    const options = {
      expectedInputs: inputType === 'image'
        ? [
            { type: 'text' as const, languages: [language] },
            { type: 'image' as const },
          ]
        : [{ type: 'text' as const, languages: [language] }],
      expectedOutputs: [{ type: 'text' as const, languages: [language] }],
    }
    const availability = await promptApi.availability(options)

    switch (availability) {
      case 'available':
        return {
          status: 'available',
          message: 'The browser reports that its on-device language model is ready.',
        }
      case 'downloadable':
        return {
          status: 'downloadable',
          message:
            'The browser reports that a model download is required. Preparation needs a user action, storage, and an internet connection.',
        }
      case 'downloading':
        return {
          status: 'downloading',
          message: 'The browser reports that its on-device model is downloading.',
        }
      case 'unavailable':
        return {
          status: 'unavailable',
          message:
            'The browser reports that on-device inference is unavailable for this device or language configuration.',
        }
      default:
        return {
          status: 'unknown',
          message: 'The browser returned an availability state this app does not recognize.',
        }
    }
  } catch {
    return {
      status: 'unknown',
      message: 'The browser could not determine on-device model availability.',
    }
  }
}
