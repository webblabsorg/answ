import { Injectable } from '@nestjs/common';

@Injectable()
export class LMSService {
  listProviders() {
    return [
      { id: 'google_classroom', name: 'Google Classroom', status: 'available' },
      { id: 'canvas', name: 'Canvas', status: 'available' },
    ];
  }

  getMockCourses(provider: string) {
    if (provider === 'google_classroom') {
      return [
        { id: 'gc-101', name: 'Algebra I', section: 'Period 2' },
        { id: 'gc-202', name: 'English Literature', section: 'A' },
      ];
    }
    if (provider === 'canvas') {
      return [
        { id: 'cv-555', name: 'Physics 101', term: 'Fall' },
        { id: 'cv-777', name: 'Chemistry Lab', term: 'Fall' },
      ];
    }
    return [];
  }
}
