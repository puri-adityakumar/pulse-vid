import { processVideo, ProcessVideoOptions } from './videoProcessor';

interface QueueItem {
  videoId: string;
  userId: string;
  inputPath: string;
  filename: string;
}

class ProcessingQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;

  enqueue(item: QueueItem): void {
    console.log(`Enqueuing video: ${item.videoId}`);
    this.queue.push(item);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing queue size: ${this.queue.length}`);

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        try {
          await processVideo(item);
        } catch (error) {
          console.error(`Failed to process video ${item.videoId}:`, error);
        }
      }
    }

    this.isProcessing = false;
    console.log('Queue processing completed');
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  isQueueProcessing(): boolean {
    return this.isProcessing;
  }
}

export const processingQueue = new ProcessingQueue();
