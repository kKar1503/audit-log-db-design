import { PrismaClient } from '@prisma/client';
import { User, UserDBValue } from '../types/User';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

export = {
  getAllLatest: async () => {
    const allUsers = await prisma.user.findMany();
    const pointers = allUsers.map((u) => Number(u.pos));
    const allUsersEvents = await Promise.all(
      allUsers.map((user) =>
        prisma.user_events.findMany({
          where: {
            user_uuid: user.uuid,
          },
          orderBy: {
            user_pos: 'asc',
          },
        })
      )
    );
    const users: User[] = [];
    allUsersEvents.forEach((userEvents, userNum) => {
      if (userEvents[userEvents.length - 1].action !== 'delete')
        users.push(
          userEvents.reduce<User>((obj, curr, i) => {
            if (i > pointers[userNum]) return obj;
            if (i === 0) {
              const { age, first, last } = JSON.parse(
                curr.value
              ) as UserDBValue;
              return {
                uuid: curr.user_uuid,
                createdAt: curr.datetime,
                updatedAt: curr.datetime,
                age,
                first,
                last,
              } as User;
            }
            obj = {
              ...obj,
              ...JSON.parse(curr.value),
              updatedAt: curr.datetime,
            };
            return obj;
          }, {} as User)
        );
    });
    return users;
  },
  getById: async (uuid: string) => {
    const user = await prisma.user.findUnique({
      where: {
        uuid,
      },
    });
    const userEvents = await prisma.user_events.findMany({
      where: {
        user_uuid: uuid,
      },
      orderBy: {
        user_pos: 'asc',
      },
    });
    if (userEvents[userEvents.length - 1].action === 'delete') return null;
    return userEvents.reduce<User>((obj, curr, i) => {
      if (i > Number(user!.pos)) return obj;
      if (i === 0) {
        const { age, first, last } = JSON.parse(curr.value) as UserDBValue;
        return {
          uuid: curr.user_uuid,
          createdAt: curr.datetime,
          updatedAt: curr.datetime,
          age,
          first,
          last,
        } as User;
      }
      obj = {
        ...obj,
        ...JSON.parse(curr.value),
        updatedAt: curr.datetime,
      };
      return obj;
    }, {} as User);
  },
  movePointer: async (uuid: string, pos: number) => {
    const maxPos = await prisma.user_events
      .findFirst({
        where: {
          user_uuid: uuid,
        },
        select: {
          user_pos: true,
        },
        orderBy: {
          user_pos: 'desc',
        },
      })
      .then((r) => Number(r?.user_pos));
    if (pos > Number(maxPos)) throw new Error('Out of range');
    return prisma.user.update({
      where: {
        uuid,
      },
      data: {
        pos,
      },
    });
  },
  insert: async (user: UserDBValue) => {
    const uuid = randomUUID();
    return prisma.user.create({
      data: {
        uuid,
        pos: 0,
        user_events: {
          create: {
            user_pos: 0,
            action: 'create',
            value: JSON.stringify(user),
          },
        },
      },
    });
  },
  update: async (user_uuid: string, newValues: UserDBValue) => {
    const lastPos = await prisma.user.findUnique({
      where: {
        uuid: user_uuid,
      },
      select: {
        pos: true,
      },
    });
    // TODO: Check if user is deleted.
    const res = await prisma.user_events.upsert({
      create: {
        user_uuid,
        user_pos: Number(lastPos?.pos) + 1,
        action: 'update',
        value: JSON.stringify(newValues),
      },
      where: {
        user_uuid_user_pos: {
          user_uuid,
          user_pos: Number(lastPos?.pos) + 1,
        },
      },
      update: {
        action: 'update',
        value: JSON.stringify(newValues),
      },
    });
    await prisma.user.update({
      where: {
        uuid: user_uuid,
      },
      data: {
        pos: {
          increment: 1,
        },
      },
    });
    return res;
  },
  delete: async (user_uuid: string) => {
    const lastPos = await prisma.user
      .findUnique({
        where: {
          uuid: user_uuid,
        },
        select: {
          pos: true,
        },
      })
      .then((v) => Number(v?.pos));
    // TODO: Check if user is already deleted
    const res = await prisma.user_events.create({
      data: {
        user_uuid,
        user_pos: lastPos + 1,
        action: 'delete',
        value: JSON.stringify({}),
      },
    });
    await prisma.user.update({
      where: {
        uuid: user_uuid,
      },
      data: {
        pos: {
          increment: 1,
        },
      },
    });
    return res;
  },
};
