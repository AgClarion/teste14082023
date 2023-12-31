// import { subHours } from "date-fns";
const add = require('date-fns/add')
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  groupContact?: Contact
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: groupContact ? groupContact.id : contact.id
    }
  });

  if (ticket) {
    await ticket.update({ unreadMessages });
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });
    }
  }

  if (!ticket && !groupContact) {
    const listSettingsService = await ListSettingsServiceOne({key: "timeCreateNewTicket"});
    var timeCreateNewTicket = listSettingsService?.value;


    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+add(new Date(), {seconds: timeCreateNewTicket}), +new Date()]
        },
        contactId: contact.id
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });
    }
  }

  if (!ticket) {

        //ATIVA/DESATIVA BOTPRESS
        var botpress = true
        
        if(botpress){
            ticket = await Ticket.create({
                contactId: groupContact ? groupContact.id : contact.id,
                //status: "pending",
                //Abre ticket com status open para o userId BOT (id = 2)
                status: "open",
                userId: 2,
                isGroup: !!groupContact,
                unreadMessages,
                whatsappId
            });
        }else{    
            ticket = await Ticket.create({
              contactId: groupContact ? groupContact.id : contact.id,
              status: "pending",
              isGroup: !!groupContact,
              unreadMessages,
              whatsappId
            });
          }
    let ticket_all = await Ticket.findAll({
          where: {
            status: {
              [Op.or]: ["open", "pending"]
            },
            id: { [Op.not]: ticket.id },
            contactId: groupContact ? groupContact.id : contact.id
          }
        }).then((result) => {
          if(result){
            result.forEach(function (r) {
              r.update({ status: 'close' });
              r.save();
            });
          }
       })  
  }

  ticket = await ShowTicketService(ticket.id);

  return ticket;
};

export default FindOrCreateTicketService;
