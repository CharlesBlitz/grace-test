import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface OrganizationBranding {
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
}

interface DailyNoteData {
  resident_name: string;
  document_date: string;
  care_notes: string;
  mood_assessment: string;
  physical_health: string;
  social_engagement: string;
  concerns: string[];
  staff_name: string;
  created_at: string;
}

interface IncidentReportData {
  resident_name: string;
  incident_date: string;
  severity: string;
  categories: string[];
  description: string;
  immediate_actions: string;
  witnesses: string[];
  staff_notified: string[];
  follow_up_required: string;
}

interface CarePlanData {
  resident_name: string;
  plan_name: string;
  start_date: string;
  review_date: string;
  goals: Array<{
    name: string;
    category: string;
    target_date: string;
    progress: number;
  }>;
  tasks: Array<{
    name: string;
    frequency: string;
    completion_rate: number;
  }>;
}

export class PDFExporter {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 15;
  private currentY: number = 15;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private addHeader(organization: OrganizationBranding, title: string) {
    this.doc.setFontSize(10);
    this.doc.setTextColor(100);
    this.doc.text(organization.name, this.margin, this.currentY);

    if (organization.address) {
      this.currentY += 5;
      this.doc.text(organization.address, this.margin, this.currentY);
    }

    if (organization.phone) {
      this.currentY += 5;
      this.doc.text(organization.phone, this.margin, this.currentY);
    }

    this.currentY += 10;
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);

    this.currentY += 10;
    this.doc.setFontSize(18);
    this.doc.setTextColor(0);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 10;
  }

  private addFooter(pageNumber: number) {
    const footerY = this.pageHeight - 10;
    this.doc.setFontSize(8);
    this.doc.setTextColor(150);

    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
    this.doc.text(`Generated: ${timestamp}`, this.margin, footerY);

    const pageText = `Page ${pageNumber}`;
    const pageTextWidth = this.doc.getTextWidth(pageText);
    this.doc.text(pageText, this.pageWidth - this.margin - pageTextWidth, footerY);

    this.doc.text('CONFIDENTIAL - For authorized use only', this.pageWidth / 2, footerY, { align: 'center' });
  }

  private checkPageBreak(requiredSpace: number = 20) {
    if (this.currentY + requiredSpace > this.pageHeight - 20) {
      this.doc.addPage();
      this.currentY = this.margin;
      return true;
    }
    return false;
  }

  private addSection(title: string, content: string) {
    this.checkPageBreak(30);

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 7;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    const lines = this.doc.splitTextToSize(content, this.pageWidth - 2 * this.margin);
    lines.forEach((line: string) => {
      this.checkPageBreak();
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += 5;
    });

    this.currentY += 5;
  }

  exportDailyNote(data: DailyNoteData, organization: OrganizationBranding): Blob {
    this.addHeader(organization, 'Daily Care Note');

    this.doc.setFontSize(12);
    this.doc.text(`Resident: ${data.resident_name}`, this.margin, this.currentY);
    this.currentY += 7;
    this.doc.text(`Date: ${format(new Date(data.document_date), 'dd MMMM yyyy')}`, this.margin, this.currentY);
    this.currentY += 10;

    this.addSection('Care Notes', data.care_notes);
    this.addSection('Mood Assessment', data.mood_assessment);
    this.addSection('Physical Health', data.physical_health);
    this.addSection('Social Engagement', data.social_engagement);

    if (data.concerns && data.concerns.length > 0) {
      this.checkPageBreak(30);
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Concerns Noted:', this.margin, this.currentY);
      this.currentY += 7;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      data.concerns.forEach(concern => {
        this.checkPageBreak();
        this.doc.text(`• ${concern}`, this.margin + 5, this.currentY);
        this.currentY += 6;
      });
      this.currentY += 5;
    }

    this.currentY += 10;
    this.doc.setFontSize(10);
    this.doc.text(`Documented by: ${data.staff_name}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`Generated: ${format(new Date(data.created_at), 'dd/MM/yyyy HH:mm')}`, this.margin, this.currentY);

    this.addFooter(1);

    return this.doc.output('blob');
  }

  exportIncidentReport(data: IncidentReportData, organization: OrganizationBranding): Blob {
    this.addHeader(organization, 'Incident Report');

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`SEVERITY: ${data.severity.toUpperCase()}`, this.margin, this.currentY);
    this.currentY += 10;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Resident: ${data.resident_name}`, this.margin, this.currentY);
    this.currentY += 7;
    this.doc.text(`Date/Time: ${format(new Date(data.incident_date), 'dd MMMM yyyy HH:mm')}`, this.margin, this.currentY);
    this.currentY += 7;
    this.doc.text(`Categories: ${data.categories.join(', ')}`, this.margin, this.currentY);
    this.currentY += 10;

    this.addSection('Incident Description', data.description);
    this.addSection('Immediate Actions Taken', data.immediate_actions);

    if (data.witnesses && data.witnesses.length > 0) {
      this.checkPageBreak(30);
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Witnesses:', this.margin, this.currentY);
      this.currentY += 7;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      data.witnesses.forEach(witness => {
        this.checkPageBreak();
        this.doc.text(`• ${witness}`, this.margin + 5, this.currentY);
        this.currentY += 6;
      });
      this.currentY += 5;
    }

    if (data.staff_notified && data.staff_notified.length > 0) {
      this.checkPageBreak(30);
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Staff Notified:', this.margin, this.currentY);
      this.currentY += 7;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      data.staff_notified.forEach(staff => {
        this.checkPageBreak();
        this.doc.text(`• ${staff}`, this.margin + 5, this.currentY);
        this.currentY += 6;
      });
      this.currentY += 5;
    }

    this.addSection('Follow-up Required', data.follow_up_required);

    this.addFooter(1);

    return this.doc.output('blob');
  }

  exportCarePlan(data: CarePlanData, organization: OrganizationBranding): Blob {
    this.addHeader(organization, 'Care Plan');

    this.doc.setFontSize(12);
    this.doc.text(`Resident: ${data.resident_name}`, this.margin, this.currentY);
    this.currentY += 7;
    this.doc.text(`Care Plan: ${data.plan_name}`, this.margin, this.currentY);
    this.currentY += 7;
    this.doc.text(`Start Date: ${format(new Date(data.start_date), 'dd MMMM yyyy')}`, this.margin, this.currentY);
    this.currentY += 7;
    this.doc.text(`Next Review: ${format(new Date(data.review_date), 'dd MMMM yyyy')}`, this.margin, this.currentY);
    this.currentY += 15;

    if (data.goals && data.goals.length > 0) {
      this.checkPageBreak(40);
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Care Goals', this.margin, this.currentY);
      this.currentY += 10;

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Goal', 'Category', 'Target Date', 'Progress']],
        body: data.goals.map(goal => [
          goal.name,
          goal.category,
          format(new Date(goal.target_date), 'dd/MM/yyyy'),
          `${goal.progress}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    }

    if (data.tasks && data.tasks.length > 0) {
      this.checkPageBreak(40);
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Daily Tasks', this.margin, this.currentY);
      this.currentY += 10;

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Task', 'Frequency', 'Completion Rate']],
        body: data.tasks.map(task => [
          task.name,
          task.frequency,
          `${task.completion_rate}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: this.margin, right: this.margin },
      });
    }

    this.addFooter(1);

    return this.doc.output('blob');
  }

  exportBatchDocuments(documents: any[], type: string, organization: OrganizationBranding): Blob {
    documents.forEach((doc, index) => {
      if (index > 0) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      if (type === 'daily_note') {
        this.exportDailyNote(doc, organization);
      } else if (type === 'incident') {
        this.exportIncidentReport(doc, organization);
      } else if (type === 'care_plan') {
        this.exportCarePlan(doc, organization);
      }
    });

    return this.doc.output('blob');
  }
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
