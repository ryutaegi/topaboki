import { Controller, Get, Post, Body, HttpException, HttpStatus, UseInterceptors, UploadedFile, Query, Headers } from '@nestjs/common';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly httpService: HttpService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyze(@UploadedFile() file: Express.Multer.File, @Query('roomId') roomId: number, @Headers('authorization') authorization: string): Promise<any> {
    try {
      const aiServerUrl = process.env.AI_API_URL || 'http://ai:8000';
      const formData = new FormData();
      const fileBlob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', fileBlob, file.originalname);

      const response = await this.httpService.post(`${aiServerUrl}/analyze?roomId=${roomId}`, formData, {
        headers: {
          'Authorization': authorization,
        },
      }).toPromise();
      return response!.data;
    } catch (error) {
      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      } else {
        throw new HttpException('AI 서버 통신 오류', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
