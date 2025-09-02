import { Controller, Post, Body, Res } from '@nestjs/common';
import { TtsService } from './tts.service';
import { Response } from 'express';

@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post()
  async generateSpeech(@Body('text') text: string, @Res() res: Response) {
    if (!text) {
      return res.status(400).send('Text is required');
    }

    try {
      const audioBuffer = await this.ttsService.generateSpeech(text);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } catch (error) {
      console.error('Error generating speech:', error);
      res.status(500).send('Error generating speech');
    }
  }
}