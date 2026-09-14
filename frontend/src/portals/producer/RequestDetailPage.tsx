import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useRequestDetail } from './hooks';
import { Card, Timeline, Alert, Button } from '../../design-system';
import type { TimelineStep, TimelineStepState } from '../../design-system';
import type { VerificationRequest } from '../../lib/api-types';

function buildSteps(request: VerificationRequest): TimelineStep[] {
  const steps: TimelineStep[] = [
    { label: 'تم إرسال الطلب', date: new Date(request.createdAt).toLocaleDateString('ar-TN'), state: 'done' },
  ];

  if (request.status === 'REJECTED') {
    steps.push({ label: 'تم رفض الطلب', description: 'يمكنك التواصل معنا لمعرفة السبب.', state: 'error' });
    return steps;
  }

  steps.push({
    label: 'قيد المراجعة',
    state: request.status === 'NEW' || request.status === 'IN_REVIEW' ? 'current' : 'done',
  });

  if (request.status === 'NEW' || request.status === 'IN_REVIEW') {
    steps.push({ label: 'جمع العينة', state: 'pending' });
    steps.push({ label: 'التحليل المخبري', state: 'pending' });
    steps.push({ label: 'النتيجة النهائية', state: 'pending' });
    return steps;
  }

  // status === ACCEPTED à partir d'ici
  const sample = request.samples?.[0];
  const sampleState: TimelineStepState = sample ? 'done' : 'current';
  steps.push({ label: 'جمع العينة', state: sampleState });

  const inLab = sample && (sample.status === 'RECEIVED_AT_LAB' || sample.status === 'ANALYZED');
  const analysisState: TimelineStepState = inLab ? 'done' : sample ? 'current' : 'pending';
  steps.push({
    label: 'التحليل المخبري',
    description: sample && !inLab ? 'العينة في طريقها إلى المخبر' : undefined,
    state: analysisState,
  });

  const verification = request.verifications?.[0];
  if (verification?.status === 'VERIFIED') {
    steps.push({ label: 'تم التحقق ✅', description: verification.notes ?? undefined, state: 'done' });
  } else if (verification?.status === 'NOT_VERIFIED') {
    steps.push({ label: 'غير مطابق للمعايير', description: verification.notes ?? undefined, state: 'error' });
  } else {
    steps.push({ label: 'النتيجة النهائية', state: sample?.status === 'ANALYZED' ? 'current' : 'pending' });
  }

  return steps;
}

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: request, isLoading } = useRequestDetail(id);

  if (isLoading) {
    return <p className="text-sm text-gray-400">جارٍ التحميل...</p>;
  }

  if (!request) {
    return (
      <Alert tone="error">لم يتم العثور على هذا الطلب.</Alert>
    );
  }

  const steps = buildSteps(request);

  return (
    <div className="max-w-2xl">
      <Link to="/producteur/demandes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C261B] mb-4">
        <ArrowRight className="w-4 h-4" />
        العودة إلى طلباتي
      </Link>

      {searchParams.get('envoye') && (
        <Alert tone="success" className="mb-6">تم إرسال طلبك بنجاح. سنرد خلال 48 ساعة.</Alert>
      )}

      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">{request.honeyType}</h1>
      <p className="text-gray-500 mb-6">{request.collectionLocation} · {request.quantity} كغ</p>

      {request.description && (
        <Card className="mb-6 bg-[#FAF6EE]/60">
          <p className="text-sm text-gray-600">{request.description}</p>
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-[#0C261B] mb-6">مراحل طلبك</h2>
        <Timeline steps={steps} />
      </Card>
    </div>
  );
};
