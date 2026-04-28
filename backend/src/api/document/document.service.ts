import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentItem } from '../../entity/DocumentItem';
import * as uuid from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../../entity/EntityItem';
import { DocumentTypeItem } from '../../entity/DocumentTypeItem';
import { PersonItem } from '../../entity/PersonItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for document operations, including upload and download logic.
 *
 * @property        {EntityManager} em  Entity manager for database operations
 *
 * @method          uploadDocument     Uploads a document for a given entity and reference
 * @method          downloadDocument   Downloads a document by handle
 */
@Injectable()
export class DocumentService {
  /**
   * Entity manager for database operations.
   * @type {EntityManager}
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Uploads a document for a given entity and reference.
   * @param {Express.Multer.File} file Uploaded file
   * @param {string} entityHandle Name of the entity
   * @param {string} reference Reference handle
   * @param {string} typeHandle Type handle for the document
   * @param {PersonItem} currentUser Current user object
   * @param {string} description Optional description
   * @returns Uploaded DocumentItem
   */
  async uploadDocument(
    file: Express.Multer.File,
    entityHandle: string,
    reference: string,
    typeHandle: string,
    currentUser: PersonItem,
    description?: string,
  ): Promise<DocumentItem> {
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    if (!entity) throw new NotFoundException('global.entityNotFound');
    const type = await this.em.findOne(DocumentTypeItem, {
      handle: typeHandle,
    });
    if (!type) throw new NotFoundException('document.documentTypeNotFound');

    const guid = uuid.v4();
    const storageDir = path.join(__dirname, '../../../storage', entityHandle);
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
    document.person = { handle: currentUser.handle } as PersonItem;
    await this.em.persist(document).flush();
    return document;
  }

  /**
   * Downloads a document by handle.
   * @param {number} handle Document handle
   * @param {PersonItem} currentUser Current user object
   * @returns Object containing file path and document item
   */
  async downloadDocument(
    handle: number,
    _currentUser: PersonItem,
  ): Promise<{ filePath: string; document: DocumentItem }> {
    void _currentUser;

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
