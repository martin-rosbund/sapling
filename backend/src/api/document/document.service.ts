import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentItem } from '../../entity/DocumentItem';
import * as uuid from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { EntityManager } from '@mikro-orm/mysql';
import { EntityItem } from 'src/entity/EntityItem';
import { DocumentTypeItem } from 'src/entity/DocumentTypeItem';

@Injectable()
export class DocumentService {
  constructor(private readonly em: EntityManager) {}

  async uploadDocument(
    file: Express.Multer.File,
    entityName: string,
    reference: string,
    typeHandle: string,
    description?: string,
  ): Promise<DocumentItem> {
    const entity = await this.em.findOne(EntityItem, { handle: entityName });
    if (!entity) throw new NotFoundException('global.entityNotFound');
    const type = await this.em.findOne(DocumentTypeItem, {
      handle: typeHandle,
    });
    if (!type) throw new NotFoundException('document.documentTypeNotFound');

    const guid = uuid.v4();
    const storageDir = path.join(__dirname, '../../../storage', entityName);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const filePath = path.join(storageDir, guid);
    fs.writeFileSync(filePath, file.buffer);

    const document = new DocumentItem();
    document.reference = reference;
    document.path = guid;
    document.filename = file.originalname;
    document.mimetype = file.mimetype;
    document.length = file.size;
    document.description = description;
    document.entity = entity;
    document.type = type;
    await this.em.persist(document).flush();
    return document;
  }

  async downloadDocument(
    handle: number,
  ): Promise<{ filePath: string; document: DocumentItem }> {
    const document = await this.em.findOne(
      DocumentItem,
      { handle: handle },
      { populate: ['entity'] },
    );
    if (!document) throw new NotFoundException('document.documentNotFound');

    const filePath = path.join(
      __dirname,
      '../../../storage',
      document.entity.handle,
      document.path,
    );

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('document.fileNotFound');
    }

    return { filePath, document };
  }
}
