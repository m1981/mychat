export class SubmissionLock {
  private isLocked: boolean = false;

  lock(): boolean {
    if (this.isLocked) {
      return false;
    }
    this.isLocked = true;
    return true;
  }

  unlock(): void {
    this.isLocked = false;
  }

  isActive(): boolean {
    return this.isLocked;
  }
}