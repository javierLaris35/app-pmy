import { axiosConfig } from "../axios-config";

export type DocumentFormat = 'email' | 'pdf' | 'excel' | 'report' | 'letter' | 'receipt' | 'label' | 'statement';
export type VersionStatus = 'draft' | 'published' | 'archived';

export interface DocumentTemplate {
  id: string; code: string; name: string; type: DocumentFormat;
  description?: string | null; language: string; active: boolean;
  category?: string | null; currentVersionId?: string | null;
}
export interface DocumentTemplateVersion {
  id: string; templateId: string; version: number; status: VersionStatus;
  subject?: string | null; designJson?: any; compiledBody?: string | null;
  changelog?: string | null; createdByName?: string | null; createdAt: string; publishedAt?: string | null;
}
export interface TemplateVariableDef {
  id: string; templateId: string; name: string; label: string;
  dataType: 'string' | 'number' | 'date' | 'currency' | 'boolean'; example?: string | null; required: boolean;
}
export interface Brand {
  id?: string; key?: string; logoLight?: string | null; logoDark?: string | null;
  colors?: Record<string, string> | null; typography?: Record<string, string> | null;
  borderRadius?: string | null; spacing?: Record<string, string> | null;
  fiscal?: Record<string, string> | null; contact?: Record<string, string> | null; social?: Record<string, string> | null;
}
export interface RenderResult { format: string; mime: string; subject?: string; html?: string; }
export interface TemplateForEdit { template: DocumentTemplate; variables: TemplateVariableDef[]; versions: DocumentTemplateVersion[]; }

export const listTemplates = async () =>
  (await axiosConfig.get<DocumentTemplate[]>("documents/templates")).data;

export const getTemplateForEdit = async (id: string) =>
  (await axiosConfig.get<TemplateForEdit>(`documents/templates/${id}/edit`)).data;

export const createTemplate = async (dto: { code: string; name: string; type: DocumentFormat; description?: string }) =>
  (await axiosConfig.post<DocumentTemplate>("documents/templates", dto)).data;

export const saveDraft = async (id: string, dto: { subject?: string; designJson?: any; compiledBody?: string; changelog?: string }) =>
  (await axiosConfig.post<DocumentTemplateVersion>(`documents/templates/${id}/draft`, dto)).data;

export const publishVersion = async (id: string, versionId: string) =>
  (await axiosConfig.post<DocumentTemplate>(`documents/templates/${id}/publish`, { versionId })).data;

export const restoreVersion = async (id: string, fromVersionId: string) =>
  (await axiosConfig.post<DocumentTemplateVersion>(`documents/templates/${id}/restore`, { fromVersionId })).data;

export const listVersions = async (id: string) =>
  (await axiosConfig.get<DocumentTemplateVersion[]>(`documents/templates/${id}/versions`)).data;

export const previewVersion = async (id: string, versionId: string, sampleData: Record<string, any>) =>
  (await axiosConfig.post<RenderResult>(`documents/templates/${id}/versions/${versionId}/preview`, { sampleData })).data;

export const previewPublished = async (code: string, sampleData: Record<string, any>) =>
  (await axiosConfig.post<RenderResult>(`documents/templates/${code}/preview`, { sampleData })).data;

export const testSend = async (code: string, payload: { to: string; sampleData?: Record<string, any> }) =>
  (await axiosConfig.post<{ ok: boolean }>(`documents/templates/${code}/test-send`, payload)).data;

export const getBrand = async () =>
  (await axiosConfig.get<Brand>("documents/brand")).data;

export const upsertBrand = async (payload: Partial<Brand>) =>
  (await axiosConfig.put<Brand>("documents/brand", payload)).data;
