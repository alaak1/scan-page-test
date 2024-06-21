import { Component, OnInit, ViewChild } from '@angular/core';
import { ZXingScannerComponent } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { QrCodeService } from '../../../qr-code.service';
import { UserService } from '../../../user.service';
import { IUserCredentials } from '../../../User.module';
import { FeedbackPopupComponent } from '../../../Helpers/feedback-popup/feedback-popup.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-scan-page',
  templateUrl: './scan-page.component.html',
  styleUrls: ['./scan-page.component.css']
})
export class ScanPageComponent implements OnInit {
  @ViewChild('scanner', { static: false }) scanner!: ZXingScannerComponent;

  qrResultString: string = '';
  currentDevice: MediaDeviceInfo | undefined;
  hasDevices: boolean = false;
  hasPermission: boolean = false;
  user: IUserCredentials | null = null;

  formats: BarcodeFormat[] = [BarcodeFormat.QR_CODE];

  constructor(
    private router: Router,
    private qrCodeService: QrCodeService,
    private userService: UserService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Check for camera permissions
    this.checkPermissions();
    // Fetch user data
    this.user = this.userService.getUser();
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.hasDevices = devices && devices.length > 0;
    console.log('Video devices found:', devices);
    if (this.hasDevices) {
      this.currentDevice = devices[0];
    } else {
      console.warn('No camera devices found.');
    }
  }

  checkPermissions(): void {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      this.hasDevices = videoDevices.length > 0;
      console.log('Video devices found:', videoDevices);
      if (this.hasDevices) {
        this.currentDevice = videoDevices[0]; // Select the preferred device, for example the first one
      }

      // Try to get user media to check for permissions
      return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    }).then(() => {
      this.hasPermission = true;
      console.log('Camera permission granted');
    }).catch(err => {
      this.hasPermission = false;
      console.error('Error accessing camera:', err);
      // Additional error handling if needed
    });
  }

  handleQrCodeResult(result: string): void {
    this.qrResultString = result;
    try {
      const qrData = JSON.parse(result);
      // Handle the scanned data as needed

      // Stop the scanner
      this.scanner.scanStop();

      // Update attendance
      this.updateAttendance(qrData);
    } catch (error) {
      console.error('Error parsing QR code result:', error);
    }
  }

  updateAttendance(qrData: { passcode: string; course_id: string; date: string }): void {
    const student_id = this.user?.id;
    if (this.user && this.user.id === student_id) {
      this.qrCodeService.updateAttendance(student_id, qrData.course_id, qrData.date, qrData.passcode).subscribe(
        response => {
          this.router.navigate(['student-dashboard']);
          this.dialog.open(FeedbackPopupComponent, {
            data: { message: 'Attendance updated successfully!' }
          });
        },
        error => {
          this.router.navigate(['student-dashboard']);
          this.dialog.open(FeedbackPopupComponent, {
            data: { message: 'Error: Could not update your attendance', error: error.message }
          });
        }
      );
    }
  }
}
